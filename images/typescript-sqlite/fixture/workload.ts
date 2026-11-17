import type {ScenarioMap} from "/opt/render/runtime/contracts.ts";
import {jsonObject,jsonArray,jsonString,jsonNumber,jsonBoolean} from "/opt/render/runtime/contracts.ts";
import assert from "node:assert/strict";
import { copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  cents: integer("cents").notNull(),
});
const write = (d:string, n:string, x:unknown) =>
  writeFileSync(join(d, n), JSON.stringify(x, null, 2) + "\n");
const read = (d:string, n:string) => jsonObject(JSON.parse(readFileSync(join(d, n), "utf8")));
const order=(value:unknown)=>{const r=jsonObject(value);return {id:jsonString(r.id),cents:jsonNumber(r.cents)};};
const job=(value:unknown)=>{const r=jsonObject(value);return {id:jsonString(r.id),state:jsonString(r.state),attempts:jsonNumber(r.attempts),lease:r.lease===null?null:jsonNumber(r.lease)};};
const migration = {
  rows: 3,
  totalCents: 7250,
  rollbackPreserved: true,
  downgradePreserved: true,
};
const queue = {
  completed: 3,
  attempts: 4,
  recoveredLeases: 1,
  duplicateRejected: true,
};
export const scenarios: ScenarioMap = {
  "sqlite-migration-workbench": {
    expectedSummary: migration,
    artifacts: ["orders.db", "migration.json"],
    async prepare(d) {
      const db = new Database(join(d, "baseline.db"));
      try {
        db.exec(
          "CREATE TABLE orders(id TEXT PRIMARY KEY,cents INTEGER NOT NULL CHECK(cents>=0));INSERT INTO orders VALUES('a',1250),('b',2000),('c',4000)",
        );
      } finally {
        db.close();
      }
    },
    async run({ inputDir, outputDir }) {
      copyFileSync(join(inputDir, "baseline.db"), join(outputDir, "orders.db"));
      const db = new Database(join(outputDir, "orders.db"));
      try {
        const orm = drizzle(db);
        const before = orm.select().from(orders).all();
        db.exec(
          "ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'",
        );
        assert.equal(
          jsonNumber(jsonObject(db.prepare("SELECT count(*) AS n FROM orders WHERE currency='USD'").get()).n),
          3,
        );
        assert.throws(() =>
          db.transaction(() => {
            db.prepare("UPDATE orders SET cents=cents+100 WHERE id=?").run("a");
            db.prepare("INSERT INTO orders(id,cents) VALUES(?,?)").run(
              "broken",
              -1,
            );
          })(),
        );
        const rollbackPreserved =
          JSON.stringify(orm.select().from(orders).all()) ===
          JSON.stringify(before);
        db.exec("ALTER TABLE orders DROP COLUMN currency");
        const after = orm.select().from(orders).all();
        const downgradePreserved =
          JSON.stringify(before) === JSON.stringify(after);
        const result = {
          rows: after.length,
          totalCents: after.reduce((n, r) => n + r.cents, 0),
          rollbackPreserved,
          downgradePreserved,
        };
        write(outputDir, "migration.json", {
          ...result,
          orders: after,
          columns: db
            .prepare("PRAGMA table_info(orders)")
            .all()
            .map((x) => jsonString(jsonObject(x).name)),
        });
        return result;
      } finally {
        db.close();
      }
    },
    async verify({ outputDir }) {
      const db = new Database(join(outputDir, "orders.db"), { readonly: true });
      try {
        const rows = db.prepare("SELECT * FROM orders ORDER BY id").all().map(order);
        assert.deepEqual(rows, [
          { id: "a", cents: 1250 },
          { id: "b", cents: 2000 },
          { id: "c", cents: 4000 },
        ]);
        assert.deepEqual(
          db
            .prepare("PRAGMA table_info(orders)")
            .all()
            .map((x) => jsonString(jsonObject(x).name)),
          ["id", "cents"],
        );
        const result = read(outputDir, "migration.json");
        assert.deepEqual(result.orders, rows);
        assert.equal(result.rollbackPreserved, true);
        assert.equal(result.downgradePreserved, true);
        return {
          rows: rows.length,
          totalCents: rows.reduce((n, r) => n + r.cents, 0),
          rollbackPreserved: jsonBoolean(result.rollbackPreserved),
          downgradePreserved: jsonBoolean(result.downgradePreserved),
        };
      } finally {
        db.close();
      }
    },
  },
  "sqlite-job-queue": {
    expectedSummary: queue,
    artifacts: ["queue.db", "jobs.json"],
    async prepare(d) {
      const db = new Database(join(d, "queue.db"));
      try {
        db.exec(
          "CREATE TABLE jobs(id TEXT PRIMARY KEY,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,lease INTEGER); INSERT INTO jobs(id,state,lease) VALUES ('a','pending',NULL),('b','pending',NULL),('c','running',5)",
        );
      } finally {
        db.close();
      }
    },
    async run({ inputDir, outputDir }) {
      copyFileSync(join(inputDir, "queue.db"), join(outputDir, "queue.db"));
      const db = new Database(join(outputDir, "queue.db"));
      try {
        const recovered = db
          .prepare(
            "UPDATE jobs SET state='pending',lease=NULL WHERE state='running' AND lease < ?",
          )
          .run(10).changes;
        let duplicateRejected = false;
        try {
          db.prepare("INSERT INTO jobs(id,state) VALUES('a','pending')").run();
        } catch (e) {
          duplicateRejected = e instanceof Error && "code" in e && e.code === "SQLITE_CONSTRAINT_PRIMARYKEY";
        }
        const claim = db.transaction(() => {
          const candidate = db
            .prepare(
              "SELECT id,attempts FROM jobs WHERE state='pending' ORDER BY id LIMIT 1",
            )
            .get();
          if (!candidate) return null;
          const row=jsonObject(candidate);const job={id:jsonString(row.id),attempts:jsonNumber(row.attempts)};
          db.prepare(
            "UPDATE jobs SET state='running',attempts=attempts+1,lease=20 WHERE id=? AND state='pending'",
          ).run(job.id);
          return { ...job, attempts: job.attempts + 1 };
        });
        const trace = [];
        for (let n = 0; n < 8; n++) {
          const job = claim();
          if (!job) break;
          const state =
            job.id === "b" && job.attempts === 1 ? "pending" : "done";
          db.prepare("UPDATE jobs SET state=?,lease=NULL WHERE id=?").run(
            state,
            job.id,
          );
          trace.push({ ...job, state });
        }
        const rows = db.prepare("SELECT * FROM jobs ORDER BY id").all().map(job);
        write(outputDir, "jobs.json", {
          trace,
          rows,
          recovered,
          duplicateRejected,
        });
        return {
          completed: rows.filter((x) => x.state === "done").length,
          attempts: rows.reduce((n, x) => n + x.attempts, 0),
          recoveredLeases: recovered,
          duplicateRejected,
        };
      } finally {
        db.close();
      }
    },
    async verify({ outputDir }) {
      const db = new Database(join(outputDir, "queue.db"), { readonly: true });
      try {
        const rows = db.prepare("SELECT * FROM jobs ORDER BY id").all().map(job);
        assert.deepEqual(rows, [
          { id: "a", state: "done", attempts: 1, lease: null },
          { id: "b", state: "done", attempts: 2, lease: null },
          { id: "c", state: "done", attempts: 1, lease: null },
        ]);
        const r = read(outputDir, "jobs.json");
        assert.deepEqual(r.rows, rows);
        assert.deepEqual(
          jsonArray(r.trace).map((x) => {const row=jsonObject(x);return jsonString(row.id)+":"+jsonString(row.state);}),
          ["a:done", "b:pending", "b:done", "c:done"],
        );
        assert.equal(r.recovered, 1);
        assert.equal(r.duplicateRejected, true);
        return {
          completed: rows.filter((x) => x.state === "done").length,
          attempts: rows.reduce((n, x) => n + x.attempts, 0),
          recoveredLeases: jsonNumber(r.recovered),
          duplicateRejected: jsonBoolean(r.duplicateRejected),
        };
      } finally {
        db.close();
      }
    },
  },
};
