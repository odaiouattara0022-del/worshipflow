"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Save, User, Shield, Eye, EyeOff } from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  LEADER: "Leader",
  MEMBER: "Membre",
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // PIN change
  const [currentPin, setCurrentPin]   = useState("");
  const [newPin, setNewPin]           = useState("");
  const [confirmPin, setConfirmPin]   = useState("");
  const [showPins, setShowPins]       = useState(false);
  const [savingPin, setSavingPin]     = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((u) => {
        if (!u?.id) { router.push("/login"); return; }
        setUser(u);
        setName(u.name ?? "");
        setEmail(u.email ?? "");
        setPhone(u.phone ?? "");
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function handleSaveInfo() {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null }),
      });
      if (!res.ok) { toast.error("Erreur lors de la sauvegarde"); return; }
      toast.success("Profil mis à jour");
      setUser((u) => u ? { ...u, name, email: email || null, phone: phone || null } : u);
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePin() {
    if (!newPin) { toast.error("Nouveau mot de passe requis"); return; }
    if (newPin !== confirmPin) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (newPin.length < 4) { toast.error("Minimum 4 caractères"); return; }
    if (!user) return;
    setSavingPin(true);
    try {
      const res = await fetch(`/api/team/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }
      toast.success("Mot de passe modifié");
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSavingPin(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div>
        <Header title="Mon profil" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div>
      <Header
        title="Mon profil"
        subtitle="Gérez vos informations personnelles et votre accès"
        action={
          <Button variant="outline" onClick={handleLogout} className="text-destructive border-destructive/30 hover:bg-destructive/10">
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        }
      />

      <div className="max-w-xl space-y-6">
        {/* Avatar + role */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-semibold text-primary">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-base">{user?.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</span>
            </div>
          </div>
        </div>

        {/* Info personnelles */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Informations personnelles</h2>
          </div>

          <div className="space-y-1">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="mt-1" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (514) 000-0000" className="mt-1" />
          </div>

          <Button onClick={handleSaveInfo} disabled={saving} className="w-full mt-2">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </Button>
        </div>

        {/* Changement de mot de passe */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Mot de passe</h2>
            </div>
            <button onClick={() => setShowPins(!showPins)} className="text-muted-foreground hover:text-foreground transition-colors">
              {showPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="currentPin">Mot de passe actuel</Label>
            <Input id="currentPin" type={showPins ? "text" : "password"} value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} className="mt-1" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="newPin">Nouveau mot de passe</Label>
            <Input id="newPin" type={showPins ? "text" : "password"} value={newPin} onChange={(e) => setNewPin(e.target.value)} className="mt-1" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPin">Confirmer</Label>
            <Input id="confirmPin" type={showPins ? "text" : "password"} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} className="mt-1" />
          </div>

          <Button variant="outline" onClick={handleChangePin} disabled={savingPin} className="w-full mt-2">
            {savingPin ? "Modification…" : "Changer le mot de passe"}
          </Button>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
          <h2 className="text-sm font-semibold text-destructive mb-2">Déconnexion</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Vous serez redirigé vers la page de connexion. Votre session sera supprimée sur cet appareil.
          </p>
          <Button variant="outline" onClick={handleLogout} className="border-destructive/30 text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
