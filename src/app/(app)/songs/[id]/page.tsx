import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SongForm } from "@/components/songs/song-form";
import { Button } from "@/components/ui/button";

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      arrangements: { orderBy: { name: "asc" } },
      serviceItems: {
        include: { service: { select: { id: true, title: true, date: true } } },
        take: 10,
        orderBy: { service: { date: "desc" } },
      },
    },
  });

  if (!song) notFound();

  const tags = song.tags ? song.tags.split(",").filter(Boolean) : [];
  const lyricsLines = song.lyrics.split("\n");

  return (
    <div>
      <Header
        title={song.title}
        subtitle={song.author || undefined}
        action={
          <SongForm trigger={<Button variant="outline">Modifier</Button>} song={song} />
        }
      />

      <div className="flex gap-2 mb-6">
        <Badge variant="outline" className="text-primary border-primary/30">
          {song.defaultKey}
        </Badge>
        {song.tempo && <Badge variant="secondary">{song.tempo} BPM</Badge>}
        {tags.map((tag) => (
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Paroles</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground leading-relaxed">
              {lyricsLines.map((line, i) => (
                <span key={i} className={line.startsWith("[") ? "text-primary font-semibold block mt-4" : "block"}>
                  {line}
                </span>
              ))}
            </pre>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arrangements ({song.arrangements.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {song.arrangements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun arrangement</p>
              ) : (
                song.arrangements.map((arr) => (
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Utilis&eacute; <span className="text-foreground font-medium">{song.useCount}</span> fois
              </p>
              {song.serviceItems.map((item) => (
                <div key={item.id} className="text-xs text-muted-foreground">
                  {item.service.title} — {new Date(item.service.date).toLocaleDateString("fr-FR")}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
