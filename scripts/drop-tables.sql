-- 一次性清理：删除所有表，以便 db:push 用 uuid 主键重建
-- 在 Neon SQL Editor 中执行，或: psql $DATABASE_URL -f scripts/drop-tables.sql
-- 执行后再运行: npm run db:push && npm run db:seed

DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS completions CASCADE;
DROP TABLE IF EXISTS point_records CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
