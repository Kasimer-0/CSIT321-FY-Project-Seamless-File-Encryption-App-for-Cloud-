-- PostgreSQL database bootstrap for StealthSync development.
-- Run against the maintenance database, not the StealthSync database:
--   psql -U postgres -d postgres -f scripts/create_stealthsync_database.sql

SELECT 'CREATE DATABASE stealthsync'
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_database
    WHERE datname = 'stealthsync'
)\gexec
