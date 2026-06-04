export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { SongCard } from "@/components/songs/song-card";
import { SongForm } from "@/components/songs/song-form";
import { ImportExportButtons } from "@/components/songs/import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string; key?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const myChurch = (user as { churchId?: string | null } | null)?.churchId ?? null;
  const scope = params.scope ?? "all";

  // Visibility: global (churchId null) OR shared (isPublic) OR my church's songs.
  let where: Record<string, unknown>;
  if (scope === "mine") {
    where = myChurch ? { churchId: myChurch } : { id: "__none__" };
  } else if (scope === "public") {
    where = { OR: [{ churchId: null }, { isPublic: true }] };
  } else {
    where = { OR: [{ churchId: null }, { isPublic: true }, ...(myChurch ? [{ churchId: myChurch }] : [])] };
  }

  let songs = await prisma.song.findMany({ where, orderBy: { title: "asc" } });

  // Search/tag/key in JS (can't stack a second OR group on the REST adapter).
  if (params.search) {
    const q = params.search.toLowerCase();
    songs = songs.filter((s: any) => `${s.title} ${s.author ?? ""} ${s.lyrics ?? ""}`.toLowerCase().includes(q));
  }
  if (params.tag) songs = songs.filter((s: any) => (s.tags ?? "").toLowerCase().includes(params.tag!.toLowerCase()));
  if (params.key) songs = songs.filter((s: any) => s.defaultKey === params.key);

  const qs = (s: string) => {
    const p = new URLSearchParams();
    p.set("scope", s);
    if (params.search) p.set("search", params.search);
    return `/songs?${p.toString()}`;
  };
  const tabs = [
    { key: "all", label: "Tous" },
    { key: "public", label: "Publics" },
    ...(myChurch ? [{ key: "mine", label: "Mon église" }] : []),
  ];

  return (
    <div>
      <Header
        title="Chants"
        subtitle={`${songs.length} chant${songs.length !== 1 ? "s" : ""}`}
        action={<SongForm trigger={<Button>+ Nouveau chant</Button>} />}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <ImportExportButtons />
      </div>

      {/* Scope tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={qs(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              scope === t.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="flex flex-col sm:flex-row gap-2 mb-6">
        <input type="hidden" name="scope" value={scope} />
        <Input name="search" placeholder="Rechercher un titre, auteur..." defaultValue={params.search} className="flex-1" />
        <Button type="submit" variant="secondary">Rechercher</Button>
      </form>

      {songs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Aucun chant trouv&eacute;</p>
          <p className="text-sm">Ajoutez votre premier chant, ou consultez les chants publics</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((song: any) => (
            <SongCard key={song.id} song={song} currentChurchId={myChurch} />
          ))}
        </div>
      )}
    </div>
  );
}
