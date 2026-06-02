"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { MemberCard } from "@/components/team/member-card";
import { MemberForm } from "@/components/team/member-form";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  avatar: string | null;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, isAdmin } = useCurrentUser();
  const { confirm, ConfirmDialog } = useConfirm();

  function loadMembers() {
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function handleDelete(memberId: string, memberName: string) {
    const ok = await confirm({
      title: "Supprimer le membre",
      description: `Êtes-vous sûr de vouloir supprimer ${memberName} de l'équipe ? Cette action est irréversible.`,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`${memberName} supprimé`);
        loadMembers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  return (
    <div>
      <Header
        title="Équipe"
        subtitle={`${members.length} membre${members.length !== 1 ? "s" : ""}`}
        action={
          isAdmin ? (
            <MemberForm
              trigger={<Button>+ Nouveau membre</Button>}
              onSuccess={loadMembers}
            />
          ) : undefined
        }
      />

      {!isAdmin && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Seul un administrateur peut ajouter ou supprimer des membres.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Aucun membre</p>
          <p className="text-sm">
            Ajoutez votre premier membre pour commencer
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const isSelf = currentUser?.id === member.id;
            const canEdit = isAdmin || isSelf;
            const canDelete = isAdmin && !isSelf;

            return (
              <div key={member.id} className="relative group">
                {canEdit ? (
                  <MemberForm
                    trigger={<MemberCard member={member} />}
                    member={member}
                    onSuccess={loadMembers}
                    isAdmin={isAdmin}
                  />
                ) : (
                  <MemberCard member={member} />
                )}

                {/* Delete button — admin only, cannot delete self */}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(member.id, member.name);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                      h-7 w-7 flex items-center justify-center rounded-full
                      bg-destructive/10 text-destructive hover:bg-destructive/20
                      border border-destructive/20"
                    title={`Supprimer ${member.name}`}
                  >
                    <span className="text-sm">✕</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
