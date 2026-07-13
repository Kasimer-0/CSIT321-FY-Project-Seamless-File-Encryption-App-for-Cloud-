-- PostgreSQL database bootstrap for StealthSync development.
-- Run against the maintenance database, not the StealthSync database:
--   psql -U postgres -d postgres -f scripts/create_stealthsync_database.sql

SELECT 'CREATE DATABASE "CSIT321-FYP"'
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_database
    WHERE datname = 'CSIT321-FYP'
)\gexec
