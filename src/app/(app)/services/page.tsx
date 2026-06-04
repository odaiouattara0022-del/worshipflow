"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ServiceCard } from "@/components/services/service-card";
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

interface ServiceSummary {
  id: string;
  title: string;
  date: string;
  type: string;
  status: string;
  _count: { items: number; assignments: number };
}

interface Template {
  id: string;
  name: string;
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    type: "culte",
    templateId: "",
  });

  useEffect(() => {
    fetch("/api/services?upcoming=true")
      .then((r) => r.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      });

    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.date) return;

    setCreating(true);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        date: form.date,
        type: form.type,
        templateId: form.templateId || undefined,
      }),
    });

    if (res.ok) {
      const service = await res.json();
      setDialogOpen(false);
      setForm({ title: "", date: "", type: "culte", templateId: "" });
      router.push(`/services/${service.id}`);
    }
    setCreating(false);
  }

  return (
    <div>
      <Header
        title="Services"
        subtitle="Planification des cultes et événements"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              + Nouveau service
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau service</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="Culte du dimanche"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date et heure *</Label>
                  <Input
                    type="datetime-local"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value })
                    }
                  >
                    <option value="culte">Culte</option>
                    <option value="priere">Réunion de prière</option>
                    <option value="jeunesse">Jeunesse</option>
                    <option value="special">Événement spécial</option>
                  </select>
                </div>
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Modèle</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={form.templateId}
                      onChange={(e) =>
                        setForm({ ...form, templateId: e.target.value })
                      }
                    >
                      <option value="">-- Aucun modèle --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Création..." : "Créer le service"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Aucun service à venir</p>
          <p className="text-sm">
            Créez votre premier service pour commencer la planification
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onDeleted={() => setServices((prev) => prev.filter((s) => s.id !== service.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
