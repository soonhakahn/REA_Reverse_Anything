-- 1) Verify hypertable
SELECT hypertable_name, num_chunks FROM timescaledb_information.hypertables;
-- 2) Sample rows
SELECT * FROM rea_tool_events ORDER BY event_time DESC LIMIT 10;
-- 3) Hourly execution count / failures / avg duration
SELECT time_bucket('1 hour', event_time) AS hour, count(*) AS runs,
       count(*) FILTER (WHERE NOT success) AS failures, round(avg(duration_ms)) AS avg_ms
FROM rea_tool_events GROUP BY 1 ORDER BY 1 DESC LIMIT 12;
