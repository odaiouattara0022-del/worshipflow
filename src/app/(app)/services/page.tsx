"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ServiceCard } from "@/components/services/service-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { confirm, ConfirmDialog } = useConfirm();
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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Supprimer ${ids.length} service${ids.length > 1 ? "s" : ""} ?`,
      description: "Les services sélectionnés et tous leurs éléments seront définitivement supprimés. Cette action est irréversible.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;

    const res = await fetch("/api/services/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const data = await res.json();
      setServices((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      toast.success(`${data.count ?? ids.length} service(s) supprimé(s)`);
      exitSelectMode();
    } else {
      toast.error("Suppression impossible");
    }
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

      {!loading && services.length > 0 && (
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          {selectMode ? (
            <>
              <span className="text-sm text-muted-foreground">{selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set(services.map((s) => s.id)))}>
                  Tout sélectionner
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Supprimer ({selectedIds.size})
                </Button>
                <Button variant="ghost" size="sm" onClick={exitSelectMode}>Annuler</Button>
              </div>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              Sélectionner
            </Button>
          )}
        </div>
      )}

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
              selectable={selectMode}
              selected={selectedIds.has(service.id)}
              onToggleSelect={() => toggleSelect(service.id)}
              onDeleted={() => setServices((prev) => prev.filter((s) => s.id !== service.id))}
            />
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
