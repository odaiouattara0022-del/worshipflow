export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SongForm } from "@/components/songs/song-form";
import { SendSongToPP } from "@/components/songs/send-song-to-pp";
import { LyricsEditor } from "@/components/songs/lyrics-editor";
import { SlidePreview } from "@/components/songs/slide-preview";
import { AudioPlayer } from "@/components/songs/audio-player";
import { ChordSection } from "@/components/songs/chord-section";
import { SongTabs } from "@/components/songs/song-tabs";
import { SongScopeActions } from "@/components/songs/song-scope-actions";
import { Button } from "@/components/ui/button";

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      arrangements: { orderBy: { name: "asc" } },
      serviceItems: {
        include: { service: { select: { id: true, title: true, date: true } } },
        take: 20,
        orderBy: { service: { date: "desc" } },
      },
      usageLogs: {
        orderBy: { usedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!song) notFound();

  const tags = song.tags ? song.tags.split(",").filter(Boolean) : [];

  return (
    <div>
      <Header
        title={song.title}
        subtitle={song.author || undefined}
        action={
          <SongForm trigger={<Button variant="outline">Modifier infos</Button>} song={song} />
        }
      />

      <div className="flex gap-2 mb-6">
        <Badge variant="outline" className="text-primary border-primary/30">
          {song.defaultKey}
        </Badge>
        {song.tempo && <Badge variant="secondary">{song.tempo} BPM</Badge>}
        {tags.map((tag: string) => (
          <Badge key={tag} variant="secondary">{tag.trim()}</Badge>
        ))}
        {song.proPresenterPath ? (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            Li&eacute; &agrave; ProPresenter
          </Badge>
        ) : (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Pas dans ProPresenter
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main — tabbed: Paroles / Accords */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <SongTabs
              lyricsContent={
                <LyricsEditor
                  songId={song.id}
                  songTitle={song.title}
                  initialLyrics={song.lyrics}
                />
              }
              chordsContent={
                <ChordSection
                  songId={song.id}
                  songTitle={song.title}
                  songAuthor={song.author}
                  arrangements={song.arrangements as any[]}
                  defaultKey={song.defaultKey}
                />
              }
            />
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Send to ProPresenter */}
          <SendSongToPP songId={song.id} songTitle={song.title} />

          {/* Sharing (public / copy to my church) */}
          <SongScopeActions
            songId={song.id}
            churchId={(song as any).churchId ?? null}
            isPublic={(song as any).isPublic ?? false}
          />


          {/* Audio Player */}
          <AudioPlayer songId={song.id} audioUrl={song.audioUrl} audioLabel={song.audioLabel} />

          {/* Slide Preview */}
          {song.lyrics && (
            <SlidePreview lyrics={song.lyrics} />
          )}

          {/* CCLI / Copyright info */}
          {(song.ccliNumber || song.publisher || song.copyrightYear) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Copyright / CCLI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {song.ccliNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">N&deg; CCLI</span>
                    <span className="font-mono">{song.ccliNumber}</span>
                  </div>
                )}
                {song.publisher && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">&Eacute;diteur</span>
                    <span>{song.publisher}</span>
                  </div>
                )}
                {song.copyrightYear && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">&copy;</span>
                    <span>{song.copyrightYear}</span>
                  </div>
                )}
                {song.artistCredits && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Artiste</span>
                    <span>{song.artistCredits}</span>
                  </div>
                )}
                {song.album && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Album</span>
                    <span>{song.album}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Copyright PP</span>
                  <Badge variant={song.copyrightDisplay ? "default" : "secondary"} className="text-xs">
                    {song.copyrightDisplay ? "Actif" : "Désactivé"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Arrangements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arrangements ({song.arrangements.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {song.arrangements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun arrangement</p>
              ) : (
                song.arrangements.map((arr: any) => (
                  <div key={arr.id} className="border border-border rounded-md p-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-sm">{arr.name}</span>
                      <Badge variant="outline" className="text-xs">{arr.key}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{arr.sectionOrder}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Utilis&eacute; <span className="text-foreground font-medium">{song.useCount}</span> fois
                </span>
                {song.usageLogs.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {(() => {
                      const lastUsed = new Date(song.usageLogs[0].usedAt);
                      const diffDays = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays === 0) return "Aujourd'hui";
                      if (diffDays === 1) return "Hier";
                      if (diffDays < 7) return `Il y a ${diffDays}j`;
                      if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
                      return `Il y a ${Math.floor(diffDays / 30)} mois`;
                    })()}
                  </Badge>
                )}
              </div>
              {song.serviceItems.length > 0 ? (
                <div className="space-y-1.5">
                  {song.serviceItems.map((item: any) => (
                    <a
                      key={item.id}
                      href={`/services/${item.service.id}`}
                      className="flex items-center justify-between text-xs hover:bg-accent rounded px-2 py-1.5 -mx-2 transition-colors"
                    >
                      <span className="text-foreground">{item.service.title}</span>
                      <span className="text-muted-foreground">
                        {new Date(item.service.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Jamais utilis&eacute; dans un service</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
