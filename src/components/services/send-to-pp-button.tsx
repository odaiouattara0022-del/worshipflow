"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SendToPPButtonProps {
  serviceId: string;
}

export function SendToPPButton({ serviceId }: SendToPPButtonProps) {
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch("/api/propresenter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Échec de l'envoi");
        return;
      }

      const data = await res.json();

      if (data.playlistCreated) {
        toast.success(
          `Playlist envoyée — ${data.songsSent}/${data.totalItems} éléments synchronisés`
        );
      } else {
        toast.info(
          `Manifest généré — ${data.songsSent}/${data.totalItems} éléments traités (création de playlist non supportée par votre version PP)`
        );
      }
    } catch {
      toast.error("Impossible de contacter ProPresenter");
    } finally {
      setSending(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleSend} disabled={sending}>
      {sending ? "Envoi en cours…" : "Envoyer à ProPresenter"}
    </Button>
  );
}
