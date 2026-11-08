-- Synthetic REA tool-execution events: 3 days, one event per minute, deterministic pseudo-random values
INSERT INTO rea_tool_events (event_time, tool_name, success, duration_ms)
SELECT ts,
       (ARRAY['scan_binary','decompile_function','list_strings','trace_calls','export_report'])[1 + (floor(random()*5))::int],
       random() > 0.08,
       (20 + random()*480)::int
FROM generate_series(now() - interval '3 days', now(), interval '1 minute') AS ts;
