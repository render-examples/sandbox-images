import React from "react";
export function Chat({ text, status }) {
  return React.createElement(
    "section",
    { "aria-label": "Assistant conversation" },
    React.createElement(
      "p",
      { "aria-live": "polite", "data-testid": "message" },
      text,
    ),
    React.createElement("span", { "data-testid": "status" }, status),
  );
}
export function ToolCard({ call, onApprove, onReject }) {
  return React.createElement(
    "article",
    { "data-call-id": call.id },
    React.createElement("h2", null, call.name),
    React.createElement("pre", null, JSON.stringify(call.input)),
    React.createElement("p", { "data-testid": "status" }, call.state),
    call.state === "approval-required"
      ? React.createElement(
          "div",
          null,
          React.createElement("button", { onClick: onApprove }, "Approve"),
          React.createElement("button", { onClick: onReject }, "Reject"),
        )
      : null,
    call.output ? React.createElement("output", null, call.output) : null,
  );
}
