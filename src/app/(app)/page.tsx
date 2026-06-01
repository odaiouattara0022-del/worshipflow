export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingService } from "@/components/dashboard/upcoming-service";

export default async function DashboardPage() {
  const now = new Date();

  // Parallel queries for dashboard stats
  const [
    upcomingServices,
    totalServices,
    totalSongs,
    totalMembers,
    recentNotifications,
  ] = await Promise.all([
    prisma.service.findMany({
      where: { date: { gte: now } },
      orderBy: { date: "asc" },
      take: 5,
      include: {
        _count: { select: { items: true, assignments: true } },
      },
    }),
    prisma.service.count(),
    prisma.song.count(),
    prisma.user.count(),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  const draftCount = await prisma.service.count({
    where: { status: "DRAFT", date: { gte: now } },
  });

  const dateString = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <Header
        title="Tableau de bord"
        subtitle={dateString.charAt(0).toUpperCase() + dateString.slice(1)}
      />

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard
          label="Services à venir"
          value={upcomingServices.length}
          icon="📋"
          sublabel={draftCount > 0 ? `${draftCount} en brouillon` : "Tous prêts"}
        />
        <StatCard
          label="Total services"
          value={totalServices}
          icon="📊"
        />
        <StatCard
          label="Chants en base"
          value={totalSongs}
          icon="🎵"
        />
        <StatCard
          label="Membres d'équipe"
          value={totalMembers}
          icon="👥"
          sublabel={recentNotifications > 0 ? `${recentNotifications} notification${recentNotifications > 1 ? "s" : ""} non lue${recentNotifications > 1 ? "s" : ""}` : undefined}
        />
      </div>

      {/* Upcoming services */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Prochains services</h2>
        {upcomingServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun service planifié</p>
            <p className="text-sm mt-1">Créez un service depuis la page Services</p>
          </div>
        ) : (
          <div className="space-y-3">
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
      </div>
    </div>
  );
}
