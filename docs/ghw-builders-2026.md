# MLH Global Hack Week: Builders Week (Tiger Data)

Event: https://www.mlh.com/events/global-hack-week-builders-week/challenges

| | Existing REA project | Added during Builders Week |
|---|---|---|
| Content | REA MCP server usage, `scripts/verify-rea-mcp.mjs`, docs | `examples/tigerdata/*`, `scripts/verify-tigerdata.mjs`, this document |

## Challenge 1: Launch Your First Tiger Data Hypertable
1. Created a free Tiger Cloud service (`rea-tool-events`, AWS us-east-1).
2. `examples/tigerdata/schema.sql`: table `rea_tool_events` + `create_hypertable(..., 'event_time')`.
3. `examples/tigerdata/seed.sql`: 4,321 synthetic events (2026-11-05 to 11-08, one per minute).
4. Verified with `examples/tigerdata/queries.sql` (hypertable list, latest rows, hourly aggregation).

Evidence: `docs/ghw-builders-2026/01-hypertable-explorer.png`, `02-query-results.png`
(the latter is client output rendered as an image, not the console editor).

## Challenge 3 (listed as "Supercharge AI Agents with Tiger CLI or MCP Server")
1. Installed Tiger CLI 0.28.0, `tiger auth login --headless`, `tiger service list`, `tiger db query`.
2. `tiger mcp install claude-code`; Claude Code (restricted to the `tiger` MCP tools) ran a read-only
   `db_query` for per-tool executions, failures and average duration.
   Result: 4,321 runs, 332 failures, ~255 ms average; `scan_binary` fails most (78/853, 9.1%).

Evidence: `docs/ghw-builders-2026/03-cli-output.png`, `04-mcp-agent-output.png`.

## Notes
- Data is synthetic; tool names are illustrative, not real REA telemetry.
- Free trial lasts 30 days; credentials are not stored in this repository.
