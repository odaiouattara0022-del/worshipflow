export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { SongCard } from "@/components/songs/song-card";
import { SongForm } from "@/components/songs/song-form";
import { ImportExportButtons } from "@/components/songs/import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string; key?: string }>;
}) {
  const params = await searchParams;
  const where: Record<string, unknown> = {};

  if (params.search) {
    where.OR = [
      { title: { contains: params.search } },
      { author: { contains: params.search } },
      { lyrics: { contains: params.search } },
    ];
  }
  if (params.tag) where.tags = { contains: params.tag };
  if (params.key) where.defaultKey = params.key;

  const songs = await prisma.song.findMany({
    where,
    orderBy: { title: "asc" },
  });

  return (
    <div>
      <Header
        title="Chants"
        subtitle={`${songs.length} chant${songs.length !== 1 ? "s" : ""} dans la bibliothèque`}
        action={
          <SongForm trigger={<Button>+ Nouveau chant</Button>} />
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <ImportExportButtons />
      </div>

      <form className="flex flex-col sm:flex-row gap-2 mb-6">
        <Input
          name="search"
          placeholder="Rechercher un titre, auteur..."
          defaultValue={params.search}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">Rechercher</Button>
      </form>

      {songs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Aucun chant trouv&eacute;</p>
          <p className="text-sm">Ajoutez votre premier chant ou importez depuis ProPresenter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}
