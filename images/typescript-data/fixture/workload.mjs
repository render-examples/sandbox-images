import assert from "node:assert/strict";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
const write = (d, n, x) =>
  writeFileSync(join(d, n), JSON.stringify(x, null, 2) + "\n");
const read = (d, n) => JSON.parse(readFileSync(join(d, n), "utf8"));
const q = (s) => "'" + s.replaceAll("'", "''") + "'";
async function db(fn) {
  const i = await DuckDBInstance.create(":memory:", { threads: "1" });
  const c = await i.connect();
  try {
    return await fn(c);
  } finally {
    c.closeSync();
    i.closeSync();
  }
}
async function rows(c, sql) {
  return (await c.runAndReadAll(sql)).getRowObjectsJson();
}
const reconciliation = {
  orders: 2,
  totalCents: 3250,
  duplicatesRemoved: 1,
  unmatchedPayments: 1,
};
const analytics = {
  regions: 2,
  totalCents: 6000,
  topRegion: "west",
  topCents: 4000,
};
export const scenarios = {
  "csv-reconciliation": {
    expectedSummary: reconciliation,
    artifacts: ["reconciled.parquet", "reconciliation.json"],
    async prepare(d) {
      writeFileSync(
        join(d, "orders.csv"),
        "id,customer,cents,status\no1,acme,1250,paid\no2,beta,2000,paid\no3,acme,750,refunded\no2,beta,2000,paid\n",
      );
      writeFileSync(
        join(d, "payments.csv"),
        "id,paid\no1,1250\no2,2000\no4,100\n",
      );
    },
    async run({ inputDir, outputDir }) {
      return db(async (c) => {
        await c.run(
          `CREATE TABLE orders AS SELECT * FROM read_csv(${q(join(inputDir, "orders.csv"))},header=true); CREATE TABLE payments AS SELECT * FROM read_csv(${q(join(inputDir, "payments.csv"))},header=true); CREATE TABLE reconciled AS SELECT DISTINCT o.id,o.customer,o.cents,p.paid FROM orders o JOIN payments p USING(id) WHERE status='paid'`,
        );
        const result = await rows(c, "SELECT * FROM reconciled ORDER BY id");
        const unmatched = await rows(
          c,
          "SELECT p.id FROM payments p LEFT JOIN orders o USING(id) WHERE o.id IS NULL ORDER BY p.id",
        );
        const count = await rows(
          c,
          "SELECT count(*)::INTEGER - count(DISTINCT id)::INTEGER AS duplicates FROM orders",
        );
        await c.run(
          `COPY (SELECT * FROM reconciled ORDER BY id) TO ${q(join(outputDir, "reconciled.parquet"))} (FORMAT PARQUET)`,
        );
        write(outputDir, "reconciliation.json", {
          rows: result,
          unmatched,
          duplicates: count[0].duplicates,
        });
        return {
          orders: result.length,
          totalCents: result.reduce((n, r) => n + Number(r.cents), 0),
          duplicatesRemoved: count[0].duplicates,
          unmatchedPayments: unmatched.length,
        };
      });
    },
    async verify({ outputDir }) {
      return db(async (c) => {
        const result = await rows(
          c,
          `SELECT * FROM read_parquet(${q(join(outputDir, "reconciled.parquet"))}) ORDER BY id`,
        );
        assert.deepEqual(result, [
          { id: "o1", customer: "acme", cents: "1250", paid: "1250" },
          { id: "o2", customer: "beta", cents: "2000", paid: "2000" },
        ]);
        const r = read(outputDir, "reconciliation.json");
        assert.deepEqual(r.rows, result);
        assert.deepEqual(r.unmatched, [{ id: "o4" }]);
        assert.equal(r.duplicates, 1);
        return {
          orders: result.length,
          totalCents: result.reduce((n, r) => n + Number(r.cents), 0),
          duplicatesRemoved: r.duplicates,
          unmatchedPayments: r.unmatched.length,
        };
      });
    },
  },
  "parquet-analytics": {
    expectedSummary: analytics,
    artifacts: ["regional.parquet", "analytics.json"],
    async prepare(d) {
      await db(async (c) => {
        await c.run(
          `COPY (SELECT * FROM (VALUES ('east',1000),('west',2500),('east',1000),('west',1500)) t(region,cents)) TO ${q(join(d, "sales.parquet"))} (FORMAT PARQUET)`,
        );
      });
    },
    async run({ inputDir, outputDir }) {
      return db(async (c) => {
        await c.run(
          `CREATE TABLE totals AS SELECT region,sum(cents)::INTEGER AS total,count(*)::INTEGER AS transactions FROM read_parquet(${q(join(inputDir, "sales.parquet"))}) GROUP BY region; COPY (SELECT *,dense_rank() OVER (ORDER BY total DESC)::INTEGER AS rank FROM totals ORDER BY rank) TO ${q(join(outputDir, "regional.parquet"))} (FORMAT PARQUET)`,
        );
        const result = await rows(
          c,
          `SELECT * FROM read_parquet(${q(join(outputDir, "regional.parquet"))}) ORDER BY rank`,
        );
        write(outputDir, "analytics.json", result);
        return {
          regions: result.length,
          totalCents: result.reduce((n, r) => n + r.total, 0),
          topRegion: result[0].region,
          topCents: result[0].total,
        };
      });
    },
    async verify({ outputDir }) {
      return db(async (c) => {
        const result = await rows(
          c,
          `SELECT * FROM read_parquet(${q(join(outputDir, "regional.parquet"))}) ORDER BY rank`,
        );
        assert.deepEqual(result, [
          { region: "west", total: 4000, transactions: 2, rank: 1 },
          { region: "east", total: 2000, transactions: 2, rank: 2 },
        ]);
        assert.deepEqual(read(outputDir, "analytics.json"), result);
        return {
          regions: result.length,
          totalCents: result.reduce((n, r) => n + r.total, 0),
          topRegion: result[0].region,
          topCents: result[0].total,
        };
      });
    },
  },
};
