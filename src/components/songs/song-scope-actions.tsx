"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Globe, Lock, Copy } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface SongScopeActionsProps {
  songId: string;
  churchId: string | null;
  isPublic: boolean;
}

// Sharing controls on the song detail page:
//  - "Rendre public / privé" for a song the user's church owns (admin/owner).
//  - "Ajouter à mon église" to copy a public song into the user's own library.
export function SongScopeActions({ songId, churchId, isPublic }: SongScopeActionsProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);

  if (!user) return null;
  const myChurch = user.churchId;
  const ownedByMe = !!myChurch && churchId === myChurch;
  const canManage = ownedByMe && (["OWNER", "ADMIN"].includes(user.churchRole ?? "") || user.role === "ADMIN");
  const isPub = churchId == null || isPublic;
  const canCopy = isPub && !ownedByMe && !!myChurch;

  if (!canManage && !canCopy) return null;

  async function togglePublic() {
    setLoading(true);
    const res = await fetch(`/api/songs/${songId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !isPublic }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(!isPublic ? "Chant rendu public" : "Chant rendu privé");
      router.refresh();
    } else {
      toast.error("Action impossible");
    }
  }

  async function copyToChurch() {
    setLoading(true);
    const res = await fetch(`/api/songs/${songId}/copy`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const s = await res.json();
      toast.success("Chant ajouté à votre église");
      router.push(`/songs/${s.id}`);
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "Copie impossible");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <p className="text-sm font-medium">Partage</p>
      {canManage && (
        <Button variant="outline" className="w-full" onClick={togglePublic} disabled={loading}>
          {isPublic ? <><Lock className="h-4 w-4 mr-2" />Rendre privé</> : <><Globe className="h-4 w-4 mr-2" />Rendre public</>}
        </Button>
      )}
      {canCopy && (
        <Button variant="outline" className="w-full" onClick={copyToChurch} disabled={loading}>
          <Copy className="h-4 w-4 mr-2" />Ajouter à mon église
        </Button>
      )}
    </div>
  );
}
