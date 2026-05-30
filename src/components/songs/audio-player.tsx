"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface AudioPlayerProps {
  songId: string;
  audioUrl: string | null;
  audioLabel: string | null;
}

export function AudioPlayer({ songId, audioUrl: initialUrl, audioLabel: initialLabel }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState(initialUrl);
  const [audioLabel, setAudioLabel] = useState(initialLabel);
  const [uploading, setUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", file.name.replace(/\.[^.]+$/, ""));

    try {
      const res = await fetch(`/api/songs/${songId}/audio`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAudioUrl(data.audioUrl);
        setAudioLabel(data.audioLabel);
        toast.success("Audio ajouté !");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'upload");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    try {
      const res = await fetch(`/api/songs/${songId}/audio`, { method: "DELETE" });
      if (res.ok) {
        setAudioUrl(null);
        setAudioLabel(null);
        setIsPlaying(false);
        toast.success("Audio supprimé");
      }
    } catch {
      toast.error("Erreur");
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audio / Piste</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {audioUrl ? (
          <>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={togglePlay} className="h-8 w-8 p-0">
                {isPlaying ? "⏸" : "▶"}
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{audioLabel || "Piste audio"}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleRemove} className="text-destructive h-8 text-xs">
                Supprimer
              </Button>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              className="w-full"
              controls
            />
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-2">
              Ajoutez une piste de répétition, click track, ou audio de référence
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Upload..." : "Ajouter un fichier audio"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
