export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Le nom et le mot de passe sont requis",
  short: "Le mot de passe doit contenir au moins 1 caractère",
  mismatch: "Les deux mots de passe ne correspondent pas",
  exists: "Ce nom est déjà utilisé",
  server: "Erreur serveur, réessayez",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; name?: string; email?: string; phone?: string }>;
}) {
  const { error, name, email, phone } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-base font-bold text-primary-foreground">W</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">ProSendWorship</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Créer un compte</CardTitle>
            <CardDescription>Rejoignez votre équipe de louange</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/register" method="POST" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  type="text"
                  name="name"
                  required
                  defaultValue={name ?? ""}
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  defaultValue={email ?? ""}
                  placeholder="votre@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  defaultValue={phone ?? ""}
                  placeholder="0700000000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">Mot de passe *</Label>
                <Input
                  id="pin"
                  type="password"
                  name="pin"
                  required
                  placeholder="Votre mot de passe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinConfirm">Confirmer le mot de passe *</Label>
                <Input
                  id="pinConfirm"
                  type="password"
                  name="pinConfirm"
                  required
                  placeholder="Confirmez votre mot de passe"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">
                  {ERROR_MESSAGES[error] ?? "Erreur inconnue"}
                </p>
              )}

              <Button type="submit" className="w-full">
                Créer mon compte
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Déjà un compte ? Se connecter</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
