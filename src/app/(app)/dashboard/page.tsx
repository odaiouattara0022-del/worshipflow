export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingService } from "@/components/dashboard/upcoming-service";
import { CalendarDays, Music2, Users, Bell, Plus, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();

  const [upcomingServices, totalServices, totalSongs, totalMembers, unreadCount] =
    await Promise.all([
      prisma.service.findMany({
        where: { date: { gte: now } },
        orderBy: { date: "asc" },
        take: 5,
        include: { _count: { select: { items: true, assignments: true } } },
      }),
      prisma.service.count(),
      prisma.song.count(),
      prisma.user.count(),
      prisma.notification.count({ where: { readAt: null } }),
    ]);

  const draftCount = await prisma.service.count({
    where: { status: "DRAFT", date: { gte: now } },
  });

  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateLabel = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div>
      <Header title="Tableau de bord" subtitle={dateLabel} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Services à venir"
          value={upcomingServices.length}
          icon={CalendarDays}
          sublabel={draftCount > 0 ? `${draftCount} en brouillon` : "Tous prêts"}
          trend={draftCount > 0 ? "neutral" : "up"}
        />
        <StatCard label="Total services" value={totalServices} icon={CalendarDays} />
        <StatCard label="Chants" value={totalSongs} icon={Music2} />
        <StatCard
          label="Membres"
          value={totalMembers}
          icon={Users}
          sublabel={unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""}` : undefined}
        />
      </div>

      {/* Upcoming services */}
      <div className="space-y-1 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Prochains services</h2>
        <Link href="/services" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Voir tous <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {upcomingServices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 py-12 text-center">
          <p className="text-sm text-muted-foreground">Aucun service planifié</p>
          <Link
            href="/calendar"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer un service
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingServices.map((s: any) => (
            <UpcomingService
              key={s.id}
              id={s.id}
              title={s.title}
              date={s.date.toISOString()}
              status={s.status}
              itemCount={s._count.items}
              assignmentCount={s._count.assignments}
            />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Actions rapides</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { href: "/calendar", label: "Nouveau service", icon: Plus, desc: "Planifier" },
            { href: "/songs",    label: "Bibliothèque",   icon: Music2,      desc: "Chants" },
            { href: "/live",     label: "Live Control",   icon: Bell,        desc: "ProPresenter" },
            { href: "/themes",   label: "Thèmes",         icon: CalendarDays, desc: "Catégories" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="rounded-md bg-muted p-2 w-fit">
                <a.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
