"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamMember {
  id: string;
  name: string;
  avatar: string | null;
}

export function LoginForm({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) {
      setError("Sélectionnez votre nom");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedMember.name, pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur de connexion");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            ProSendWorship
          </CardTitle>
          <CardDescription>
            {selectedMember
              ? `Bonjour ${selectedMember.name.split(" ")[0]} !`
              : "Qui êtes-vous ?"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedMember ? (
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  Aucun membre trouvé
                </p>
              ) : (
                members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedMember(member);
                      setError("");
                      setPin("");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent hover:border-primary active:bg-accent/80"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(member.name)}
                    </div>
                    <span className="font-medium">{member.name}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setPin("");
                  setError("");
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Changer de compte
              </button>

              <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {getInitials(selectedMember.name)}
                </div>
                <span className="text-lg font-semibold">
                  {selectedMember.name}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">Mot de passe</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  autoComplete="current-password"
                  autoFocus
                  className="h-14"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || pin.length < 1}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
