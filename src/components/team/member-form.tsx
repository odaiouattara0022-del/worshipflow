"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export function MemberForm({ trigger, member }: MemberFormProps) {
  const router = useRouter();
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
    // Only send pin if provided (required for create, optional for edit)
    if (form.pin) {
      payload.pin = form.pin;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setOpen(false);
      resetForm();
      router.refresh();
    }
    setLoading(false);
  }

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
            {member ? "Modifier le membre" : "Nouveau membre"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
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
          <div className="space-y-2">
            <Label>R&ocirc;le</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>
              PIN {member ? "(laisser vide pour garder)" : "*"}
            </Label>
            <Input
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              required={!member}
              placeholder={member ? "Laisser vide pour garder" : ""}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enregistrement..." : member ? "Modifier" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
