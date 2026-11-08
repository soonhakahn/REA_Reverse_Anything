#!/usr/bin/env node
// Verifies the Tiger Data example: the table is a hypertable and has rows.
// Uses Tiger CLI (`tiger auth login` + a default service, see examples/tigerdata/README.md).
//   node scripts/verify-tigerdata.mjs
import { execFileSync } from "node:child_process";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
};
const query = (sql) =>
  JSON.parse(execFileSync("tiger", ["db", "query", "-c", sql, "-o", "json"], { encoding: "utf8" })).result_sets[0].rows;

try {
  const hyper = query("SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'rea_tool_events'");
  check("rea_tool_events is a hypertable", hyper.length === 1);
  const rows = query("SELECT count(*)::int AS n FROM rea_tool_events");
  const n = Number(rows[0][0]);
  check("rea_tool_events has rows", n > 0, `rows=${n}`);
} catch (e) {
  check("tiger CLI query works", false, String(e.message).split("\n")[0]);
}
process.exit(failures ? 1 : 0);
