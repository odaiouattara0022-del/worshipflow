"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { MemberCard } from "@/components/team/member-card";
import { MemberForm } from "@/components/team/member-form";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header
        title="Équipe"
        subtitle={`${members.length} membre${members.length !== 1 ? "s" : ""}`}
        action={
          <MemberForm trigger={<Button>+ Nouveau membre</Button>} />
        }
      />

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
          {members.map((member) => (
            <MemberForm
              key={member.id}
              trigger={<MemberCard member={member} />}
              member={member}
            />
          ))}
        </div>
      )}
    </div>
  );
}
