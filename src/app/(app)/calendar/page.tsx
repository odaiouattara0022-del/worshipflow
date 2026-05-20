"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  // Convert Sunday=0 to Monday-first: Mon=0, Tue=1, ..., Sun=6
  return firstDay === 0 ? 6 : firstDay - 1;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [services, setServices] = useState<ServiceSummary[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const days = getDaysInMonth(year, month);
  const startPad = getStartPadding(year, month);
  const today = new Date();

  // Map services by date string for quick lookup
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
            <Button variant="outline" size="sm" onClick={prevMonth}>
              ← Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd&apos;hui
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              Suivant →
            </Button>
          </div>
        }
      />

      <Card className="mt-6 p-4">
        {/* Day name headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for padding */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-24" />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayServices = servicesByDate.get(dateKey) || [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.getDate()}
                className={cn(
                  "min-h-24 p-2 rounded-lg border border-border/50 transition-colors",
                  isToday && "bg-primary/5 border-primary/30",
                  dayServices.length > 0 && "hover:bg-accent/50"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-primary"
                  )}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayServices.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => router.push(`/services/${s.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            STATUS_COLOR[s.status] || STATUS_COLOR.DRAFT
                          )}
                        />
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
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Brouillon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Prêt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span>Terminé</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
