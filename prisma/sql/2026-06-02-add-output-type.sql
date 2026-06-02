-- Multi-presentation-software support: add output type + per-software config to PPDevice.
-- RUN THIS ON SUPABASE (Dashboard → SQL Editor) BEFORE the feature goes live in production.
-- Additive and idempotent — safe to run on the existing table; existing rows become 'propresenter'.

ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'propresenter';
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS config text;

-- Verify:
-- SELECT id, name, type FROM "PPDevice";
