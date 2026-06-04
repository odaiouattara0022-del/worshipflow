import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SongCardProps {
  song: {
    id: string;
    title: string;
    author: string | null;
    defaultKey: string;
    tags: string;
    useCount: number;
    lastUsedAt: Date | string | null;
    proPresenterPath: string | null;
    churchId?: string | null;
    isPublic?: boolean;
  };
  currentChurchId?: string | null;
}

export function SongCard({ song, currentChurchId }: SongCardProps) {
  const tags = song.tags ? song.tags.split(",").filter(Boolean) : [];
  const ownedByMe = !!currentChurchId && song.churchId === currentChurchId;

  return (
    <Link href={`/songs/${song.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold">{song.title}</h3>
            <Badge variant="outline" className="text-primary border-primary/30">
              {song.defaultKey}
            </Badge>
          </div>
          {song.author && (
            <p className="text-xs text-muted-foreground mt-1">{song.author}</p>
          )}
          <div className="flex gap-1 mt-2 flex-wrap">
            {ownedByMe ? (
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                Mon église{song.isPublic ? " · publié" : ""}
              </Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                Public
              </Badge>
            )}
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag.trim()}
              </Badge>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
            <span>
              Utilis&eacute; {song.useCount} fois
              {song.lastUsedAt && (
                <span className="ml-1 opacity-70">
                  &middot; {(() => {
                    const d = Math.floor((Date.now() - new Date(song.lastUsedAt).getTime()) / 86400000);
                    if (d === 0) return "aujourd'hui";
                    if (d < 7) return `il y a ${d}j`;
                    if (d < 30) return `il y a ${Math.floor(d / 7)} sem.`;
                    return `il y a ${Math.floor(d / 30)} mois`;
                  })()}
                </span>
              )}
            </span>
            {song.proPresenterPath ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                ProPresenter
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px]">
                Pas dans PP
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
