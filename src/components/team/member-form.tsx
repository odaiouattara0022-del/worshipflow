"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROLES = [
  { value: "MEMBER", label: "Membre" },
  { value: "LEADER", label: "Leader" },
  { value: "ADMIN", label: "Admin" },
];

interface MemberFormProps {
  trigger: React.ReactElement;
  member?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
  };
  onSuccess?: () => void;
  /** Whether the current user is an admin (controls which fields are editable) */
  isAdmin?: boolean;
}

export function MemberForm({ trigger, member, onSuccess, isAdmin = true }: MemberFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: member?.name || "",
    email: member?.email || "",
    phone: member?.phone || "",
    role: member?.role || "MEMBER",
    pin: "",
  });

  function resetForm() {
    setForm({
      name: member?.name || "",
      email: member?.email || "",
      phone: member?.phone || "",
      role: member?.role || "MEMBER",
      pin: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = member ? `/api/team/${member.id}` : "/api/team";
    const method = member ? "PUT" : "POST";

    const payload: Record<string, string> = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
    };
    if (form.pin) {
      payload.pin = form.pin;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        resetForm();
        toast.success(member ? "Membre modifié" : "Membre créé");
        onSuccess?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  const isCreating = !member;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? "Nouveau membre" : `Modifier — ${member.name}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name — admin only for edit, always for create */}
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={!isCreating && !isAdmin}
            />
            {!isCreating && !isAdmin && (
              <p className="text-xs text-muted-foreground">
                Seul un admin peut modifier le nom
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>T&eacute;l&eacute;phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Role — admin only */}
          <div className="space-y-2">
            <Label>R&ocirc;le</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              disabled={!isAdmin}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Seul un admin peut changer le r&ocirc;le
              </p>
            )}
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <Label>
              PIN {isCreating ? "* (min. 4 chiffres)" : "(laisser vide pour garder)"}
            </Label>
            <Input
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              required={isCreating}
              minLength={isCreating ? 4 : undefined}
              placeholder={isCreating ? "Minimum 4 caractères" : "Laisser vide pour garder"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Enregistrement..."
              : isCreating
              ? "Créer le membre"
              : "Enregistrer les modifications"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
