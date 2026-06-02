export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
            <CardTitle className="text-base">Connexion</CardTitle>
            <CardDescription>Entrez votre nom et mot de passe</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/login-form" method="POST" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  type="text"
                  name="name"
                  required
                  placeholder="Votre nom"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">Mot de passe</Label>
                <Input
                  id="pin"
                  type="password"
                  name="pin"
                  required
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">
                  {error === "invalid" ? "Nom ou mot de passe incorrect" : "Erreur de connexion"}
                </p>
              )}

              <Button type="submit" className="w-full">
                Se connecter
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-3">Pas encore de compte ?</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/register">Créer un compte</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  );
}
