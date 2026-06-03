-- Zero-config agent pairing + multi-presentation-software support.
-- RUN THIS ON SUPABASE (Dashboard → SQL Editor, or via DIRECT_URL) BEFORE the
-- matching code is deployed. Additive and idempotent — safe on the live table;
-- existing rows keep working (type → 'propresenter', status → 'active').

-- Multi-presentation output type (from 2026-06-02; included so a single run covers everything)
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS type   text NOT NULL DEFAULT 'propresenter';
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS config text;

-- Zero-config pairing
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS "installId" text;
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'active';
ALTER TABLE "PPDevice" ADD COLUMN IF NOT EXISTS hostname   text;

-- Recognise the same agent install quickly on re-announce.
CREATE UNIQUE INDEX IF NOT EXISTS "PPDevice_installId_key"
  ON "PPDevice" ("installId") WHERE "installId" IS NOT NULL;

-- Verify:
-- SELECT id, name, type, status, hostname, "installId" FROM "PPDevice";
