# Song Multi-Tenancy (public library + per-church songs) — Design

**Date:** 2026-06-04 · **Status:** Approved

## Goal
Each church gets its own songs, isolated from other churches, plus a shared
**public** library. Churches can copy a public song into their own library to
customise it. Today there are no churches yet (both users are platform ADMINs with
`churchId = null`), and all existing songs are the public library.

## Data model — two new columns on `Song`
- `churchId text NULL` — owning church. `NULL` = global public library (curated by
  platform ADMINs).
- `isPublic boolean NOT NULL DEFAULT false` — a church may publish its own song to
  every church while still owning (and being able to edit) it.

A song is **public** when `churchId IS NULL` (global) OR `isPublic = true` (shared
by a church). Otherwise it's private to `churchId`.

## Visibility
A user sees a song when: `churchId IS NULL` **OR** `isPublic = true` **OR**
`churchId = myChurch`. A church-less user (platform admin) therefore sees every
public song — i.e. all current songs. Never another church's private songs.

`GET /api/songs?scope=all|public|mine` (default `all`): builds the church-scope
filter, fetches, then applies search/tag/key in JS (avoids stacking two PostgREST
`OR` groups, which the db.ts adapter can't combine).

## Permissions
- **Create** (`POST /api/songs`): `churchId = user.churchId` (private) if the user
  is in a church; otherwise `churchId = null` (global public, for platform admins).
  `isPublic = false`.
- **Edit / delete** (`PUT|DELETE /api/songs/[id]`): allowed when the song belongs to
  the user's church (`song.churchId === user.churchId`), OR the song is global
  (`churchId === null`) and the user is a platform `ADMIN`. Otherwise 403. Public
  songs from another church are read-only.
- **Publish** (toggle `isPublic` via PUT): only the owning church's `OWNER`/`ADMIN`
  (`churchRole`), or a platform ADMIN for global songs.

## Copy a public song into my church
`POST /api/songs/[id]/copy` — duplicates a visible public song (title, lyrics,
metadata, arrangements) into the caller's church (`churchId = user.churchId`,
`isPublic = false`). Requires the caller to be in a church. The original is
untouched. Returns the new song.

## Migration
Additive only — existing rows already have `churchId = NULL` (= global public), so
no backfill:
```sql
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "churchId" text;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "isPublic" boolean NOT NULL DEFAULT false;
```

## UI (songs page)
- Filter tabs **Tous · Publics · Mon église** (drives `?scope`). "Mon église" hidden
  when the user has no church.
- Per-song badge: **Public** (global or shared) vs **Privé** / **Mon église**.
- **Rendre public** toggle on songs the user's church owns (admin only).
- **Ajouter à mon église** on public songs the user's church doesn't own (calls the
  copy endpoint). Hidden when the user has no church.
- Ownership/role on the client via the existing `useCurrentUser` hook.

## Out of scope (separate future feature)
Granular per-member permissions assigned by the church creator. For now we use the
existing role tiers (platform `ADMIN`; church `OWNER`/`ADMIN`/`MEMBER`). The church
creator already becomes `OWNER` automatically.

## Touch points to keep working
Song pickers (service editor, rehearsal) and send-to-presentation all read
`/api/songs`, so they inherit scoping automatically. ProPresenter `.pro` auto-sync
stays per created song.
