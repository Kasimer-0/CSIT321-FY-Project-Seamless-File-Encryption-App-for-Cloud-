-- One-time cleanup for the removed Physical Token feature.
-- Back up the PostgreSQL database before running this script manually.
-- This file is intentionally not executed by application startup.

DROP TABLE IF EXISTS physical_tokens;
