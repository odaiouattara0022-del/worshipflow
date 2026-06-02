"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ServiceSummary {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-yellow-500",
  READY: "bg-green-500",
  DONE: "bg-muted-foreground",
};
const SERVICE_TYPES = [
  { value: "SUNDAY_MORNING", label: "Culte du dimanche matin" },
  { value: "SUNDAY_EVENING", label: "Culte du dimanche soir" },
  { value: "MIDWEEK", label: "Culte de semaine" },
  { value: "SPECIAL", label: "Événement spécial" },
  { value: "OTHER", label: "Autre" },
];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getStartPadding(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatDateLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [services, setServices] = useState<ServiceSummary[]>([]);

  // New service modal state
  const [modalDay, setModalDay]   = useState<Date | null>(null);
  const [newTitle, setNewTitle]   = useState("");
  const [newType, setNewType]     = useState("SUNDAY_MORNING");
  const [newTime, setNewTime]     = useState("10:00");
  const [creating, setCreating]   = useState(false);

  // Load default time + type from settings
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(s => {
        if (s.defaultServiceTime) setNewTime(s.defaultServiceTime);
        if (s.defaultServiceType) setNewType(s.defaultServiceType);
      })
      .catch(() => {});
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) setServices(await res.json());
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  function openModal(day: Date) {
    setModalDay(day);
    // Suggest a default title based on type and date
    const label = SERVICE_TYPES[0].label;
    setNewTitle(label);
    setNewType("SUNDAY_MORNING");
    setNewTime("10:00");
  }

  function closeModal() {
    setModalDay(null);
    setNewTitle("");
  }

  async function handleCreate() {
    if (!modalDay || !newTitle.trim()) return;
    setCreating(true);
    try {
      const dateStr = `${formatDateLocal(modalDay)}T${newTime}:00`;
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), date: dateStr, type: newType }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la création");
        return;
      }
      const created = await res.json();
      toast.success(`Service « ${created.title} » créé`);
      closeModal();
      fetchServices();
      router.push(`/services/${created.id}`);
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setCreating(false);
    }
  }

  const days = getDaysInMonth(year, month);
  const startPad = getStartPadding(year, month);
  const today = new Date();

  const servicesByDate = new Map<string, ServiceSummary[]>();
  for (const s of services) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!servicesByDate.has(key)) servicesByDate.set(key, []);
    servicesByDate.get(key)!.push(s);
  }

  return (
    <div>
      <Header
        title="Calendrier"
        subtitle={`${MONTH_NAMES[month]} ${year}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>← Précédent</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Aujourd&apos;hui</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>Suivant →</Button>
          </div>
        }
      />

      <Card className="mt-6 p-4">
        {/* Day name headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-24" />
          ))}

          {days.map((day) => {
            const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayServices = servicesByDate.get(dateKey) || [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.getDate()}
                onClick={() => openModal(day)}
                className={cn(
                  "min-h-24 p-2 rounded-lg border border-border/50 cursor-pointer transition-colors group",
                  isToday ? "bg-primary/5 border-primary/30" : "hover:bg-accent/50",
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-1 flex items-center justify-between",
                  isToday && "text-primary"
                )}>
                  <span>{day.getDate()}</span>
                  <span className="opacity-0 group-hover:opacity-60 text-xs text-muted-foreground transition-opacity">+</span>
                </div>
                <div className="space-y-1">
                  {dayServices.map((s) => (
                    <button
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); router.push(`/services/${s.id}`); }}
                      className="w-full text-left rounded px-1 py-0.5 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_COLOR[s.status] || STATUS_COLOR.DRAFT)} />
                        <span className="text-xs truncate">{s.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          {[["bg-yellow-500", "Brouillon"], ["bg-green-500", "Prêt"], ["bg-muted-foreground", "Terminé"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", c)} />
              <span>{l}</span>
            </div>
          ))}
          <span className="ml-auto opacity-60">Cliquez sur un jour pour créer un service</span>
        </div>
      </Card>

      {/* Create service modal */}
      {modalDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">
              Nouveau service — {modalDay.getDate()} {MONTH_NAMES[modalDay.getMonth()]} {modalDay.getFullYear()}
            </h2>

            <div className="space-y-3">
              <div>
                <Label htmlFor="svc-type">Type de service</Label>
                <select
                  id="svc-type"
                  value={newType}
                  onChange={(e) => {
                    setNewType(e.target.value);
                    const label = SERVICE_TYPES.find(t => t.value === e.target.value)?.label ?? "";
                    setNewTitle(label);
                  }}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="svc-title">Titre</Label>
                <Input
                  id="svc-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Culte du dimanche matin"
                  className="mt-1"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>

              <div>
                <Label htmlFor="svc-time">Heure</Label>
                <Input
                  id="svc-time"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="mt-1 w-32"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="flex-1">
                {creating ? "Création…" : "Créer le service"}
              </Button>
              <Button variant="outline" onClick={closeModal}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
