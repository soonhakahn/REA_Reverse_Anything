-- REA_Reverse_Anything: tool execution events (SYNTHETIC sample data, no personal info)
CREATE TABLE IF NOT EXISTS rea_tool_events (
  event_time  TIMESTAMPTZ NOT NULL,
  tool_name   TEXT        NOT NULL,
  success     BOOLEAN     NOT NULL,
  duration_ms INTEGER     NOT NULL
);

-- Convert the regular table into a Hypertable partitioned by time
SELECT create_hypertable('rea_tool_events', 'event_time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_rea_tool_events_tool_time ON rea_tool_events (tool_name, event_time DESC);
