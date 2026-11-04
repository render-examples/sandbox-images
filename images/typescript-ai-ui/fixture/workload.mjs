import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { build } from "vite";
import { Chat, ToolCard } from "./components.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const read = (d, n) => JSON.parse(readFileSync(join(d, n), "utf8"));
const write = (d, n, x) =>
  writeFileSync(join(d, n), JSON.stringify(x, null, 2) + "\n");
async function bundle(outputDir) {
  const result = await build({
    configFile: false,
    root: here,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      lib: {
        entry: join(here, "components.mjs"),
        formats: ["es"],
        fileName: "components",
      },
      rolldownOptions: { output: { codeSplitting: false } },
    },
  });
  const chunk = (Array.isArray(result) ? result : [result])
    .flatMap((r) => r.output)
    .find((x) => x.type === "chunk");
  assert.ok(chunk.code.includes("Assistant conversation"));
  writeFileSync(join(outputDir, "components.js"), chunk.code);
}
function dom() {
  const d = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "http://fixture.invalid",
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = d.window;
  globalThis.document = d.window.document;
  const root = createRoot(document.getElementById("root"));
  return {
    d,
    root,
    async close() {
      await act(async () => root.unmount());
      d.window.close();
      delete globalThis.window;
      delete globalThis.document;
    },
  };
}
const chat = {
  chunks: 4,
  renderedUpdates: 3,
  escapedMarkup: true,
  completed: true,
};
const cards = {
  approvedCalls: 1,
  rejectedCalls: 1,
  executions: 1,
  duplicatePrevented: true,
};
export const scenarios = {
  "chat-stream-workbench": {
    expectedSummary: chat,
    artifacts: ["chat.html", "stream.json", "components.js"],
    async prepare(d) {
      write(d, "events.json", [
        { type: "delta", text: "Hello " },
        { type: "delta", text: "café " },
        { type: "delta", text: "<script>unsafe()</script>" },
        { type: "done" },
      ]);
    },
    async run({ inputDir, outputDir }) {
      await bundle(outputDir);
      const events = read(inputDir, "events.json");
      const encoded = new TextEncoder().encode(
        events.map((x) => JSON.stringify(x) + "\n").join(""),
      );
      const accent = encoded.indexOf(195);
      const cuts = [accent + 1, accent + 2, encoded.length - 5, encoded.length];
      const chunks = [];
      let start = 0;
      for (const end of cuts) {
        chunks.push(encoded.slice(start, end));
        start = end;
      }
      const stream = new ReadableStream({
        start(c) {
          for (const chunk of chunks) c.enqueue(chunk);
          c.close();
        },
      });
      const reader = stream.getReader(),
        decoder = new TextDecoder("utf-8", { fatal: true });
      const fixture = dom();
      let pending = "",
        text = "",
        status = "streaming";
      const updates = [];
      try {
        act(() =>
          fixture.root.render(React.createElement(Chat, { text, status })),
        );
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          let newline;
          while ((newline = pending.indexOf("\n")) >= 0) {
            const event = JSON.parse(pending.slice(0, newline));
            pending = pending.slice(newline + 1);
            if (event.type === "delta") {
              text += event.text;
              updates.push(text);
            } else if (event.type === "done") status = "complete";
            else throw new Error("Unsupported stream event");
            act(() =>
              fixture.root.render(React.createElement(Chat, { text, status })),
            );
            assert.equal(
              document.querySelector("[data-testid=message]").textContent,
              text,
            );
          }
        }
        pending += decoder.decode();
        assert.equal(pending, "");
        assert.equal(status, "complete");
        assert.equal(document.querySelectorAll("script").length, 0);
        const html = renderToStaticMarkup(
          React.createElement(Chat, { text, status }),
        );
        writeFileSync(join(outputDir, "chat.html"), html);
        write(outputDir, "stream.json", {
          updates,
          status,
          text,
          chunks: chunks.length,
        });
        return {
          chunks: chunks.length,
          renderedUpdates: updates.length,
          escapedMarkup: html.includes("&lt;script&gt;"),
          completed: status === "complete",
        };
      } finally {
        await fixture.close();
      }
    },
    async verify({ inputDir, outputDir }) {
      const events = read(inputDir, "events.json"),
        r = read(outputDir, "stream.json");
      const updates = [];
      let text = "";
      for (const event of events)
        if (event.type === "delta") {
          text += event.text;
          updates.push(text);
        }
      assert.deepEqual(r, { updates, status: "complete", text, chunks: 4 });
      const html = readFileSync(join(outputDir, "chat.html"), "utf8"),
        d = new JSDOM(html);
      try {
        assert.equal(
          d.window.document.querySelector("[data-testid=message]").textContent,
          text,
        );
        assert.equal(
          d.window.document
            .querySelector("[aria-live]")
            .getAttribute("aria-live"),
          "polite",
        );
        assert.equal(d.window.document.querySelectorAll("script").length, 0);
        assert.ok(
          readFileSync(join(outputDir, "components.js"), "utf8").includes(
            "Assistant conversation",
          ),
        );
        return {
          chunks: r.chunks,
          renderedUpdates: r.updates.length,
          escapedMarkup: html.includes("&lt;script&gt;"),
          completed: r.status === "complete",
        };
      } finally {
        d.window.close();
      }
    },
  },
  "tool-card-workbench": {
    expectedSummary: cards,
    artifacts: ["cards.html", "actions.json", "components.js"],
    async prepare(d) {
      write(d, "calls.json", [
        {
          id: "write-1",
          name: "saveDraft",
          input: { title: "<img src=x onerror=unsafe()>" },
          state: "approval-required",
        },
        {
          id: "delete-2",
          name: "deleteDraft",
          input: { id: "draft-2" },
          state: "approval-required",
        },
      ]);
    },
    async run({ inputDir, outputDir }) {
      await bundle(outputDir);
      const calls = read(inputDir, "calls.json"),
        events = [],
        executed = new Set();
      const fixture = dom();
      function approve(call) {
        if (executed.has(call.id) || call.state !== "approval-required")
          return false;
        executed.add(call.id);
        call.state = "complete";
        call.output = "Saved synthetic draft";
        events.push({ id: call.id, action: "approved" });
        render();
        return true;
      }
      function reject(call) {
        assert.equal(call.state, "approval-required");
        call.state = "rejected";
        events.push({ id: call.id, action: "rejected" });
        render();
      }
      function render() {
        act(() =>
          fixture.root.render(
            React.createElement(
              "main",
              null,
              ...calls.map((call) =>
                React.createElement(ToolCard, {
                  key: call.id,
                  call,
                  onApprove: () => approve(call),
                  onReject: () => reject(call),
                }),
              ),
            ),
          ),
        );
      }
      try {
        render();
        assert.equal(executed.size, 0);
        document
          .querySelector("[data-call-id=write-1] button")
          .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
        const duplicatePrevented = !approve(calls[0]);
        document
          .querySelectorAll("[data-call-id=delete-2] button")[1]
          .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
        assert.equal(document.querySelectorAll("button").length, 0);
        assert.equal(document.querySelectorAll("img").length, 0);
        const html = renderToStaticMarkup(
          React.createElement(
            "main",
            null,
            ...calls.map((call) =>
              React.createElement(ToolCard, { key: call.id, call }),
            ),
          ),
        );
        writeFileSync(join(outputDir, "cards.html"), html);
        write(outputDir, "actions.json", {
          calls,
          events,
          executed: [...executed],
          duplicatePrevented,
        });
        return {
          approvedCalls: events.filter((x) => x.action === "approved").length,
          rejectedCalls: events.filter((x) => x.action === "rejected").length,
          executions: executed.size,
          duplicatePrevented,
        };
      } finally {
        await fixture.close();
      }
    },
    async verify({ inputDir, outputDir }) {
      const input = read(inputDir, "calls.json"),
        r = read(outputDir, "actions.json");
      assert.deepEqual(r.calls, [
        { ...input[0], state: "complete", output: "Saved synthetic draft" },
        { ...input[1], state: "rejected" },
      ]);
      assert.deepEqual(r.events, [
        { id: "write-1", action: "approved" },
        { id: "delete-2", action: "rejected" },
      ]);
      assert.deepEqual(r.executed, ["write-1"]);
      assert.equal(r.duplicatePrevented, true);
      const d = new JSDOM(readFileSync(join(outputDir, "cards.html"), "utf8"));
      try {
        assert.equal(d.window.document.querySelectorAll("article").length, 2);
        assert.equal(
          d.window.document.querySelectorAll("button,img,script").length,
          0,
        );
        assert.equal(
          d.window.document.querySelector("output").textContent,
          "Saved synthetic draft",
        );
        assert.ok(
          readFileSync(join(outputDir, "components.js"), "utf8").includes(
            "Assistant conversation",
          ),
        );
        return {
          approvedCalls: r.events.filter((x) => x.action === "approved").length,
          rejectedCalls: r.events.filter((x) => x.action === "rejected").length,
          executions: r.executed.length,
          duplicatePrevented: r.duplicatePrevented,
        };
      } finally {
        d.window.close();
      }
    },
  },
};
