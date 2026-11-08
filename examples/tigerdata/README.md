# Tiger Data example (synthetic REA tool-execution events)

Stores REA-style tool execution events (time, tool name, success, duration) in a Tiger Cloud
**hypertable**. All data is **synthetic**; tool names are illustrative and no personal data is used.

```bash
tiger auth login                       # Tiger CLI (https://github.com/timescale/tiger-cli)
tiger service create --name rea-tool-events --cpu shared --memory shared   # free (beta)
tiger config set service_id <service-id>
# run schema.sql then seed.sql with psql (tiger db connect) or the Tiger Console SQL editor
node scripts/verify-tigerdata.mjs                   # checks hypertable + rows
```

`queries.sql` has sample queries (latest rows, hourly `time_bucket` aggregation).

## Agent access via Tiger MCP

```bash
tiger mcp install claude-code
```

The agent can then call the `db_query` MCP tool, e.g. "per tool, how many runs, failures and what
average duration?". Never commit connection strings or passwords.
