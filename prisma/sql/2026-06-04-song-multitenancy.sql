-- Song multi-tenancy: a song can belong to a church (churchId) and/or be public.
-- Additive & idempotent. Existing rows keep churchId = NULL = global public library
-- (curated by platform ADMINs), so no backfill is needed.
-- APPLIED on Supabase 2026-06-04 (migration song_multitenancy_add_church_and_public).

ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "churchId" text;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "isPublic" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Song_churchId_idx" ON "Song" ("churchId");

-- Visibility = (churchId IS NULL) OR (isPublic) OR (churchId = myChurch)
