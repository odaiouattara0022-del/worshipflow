"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/notifications/notification-badge";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/services", label: "Services", icon: "📋" },
  { href: "/songs", label: "Chants", icon: "🎵" },
  { href: "/team", label: "Équipe", icon: "👥" },
  { href: "/propresenter", label: "ProPresenter", icon: "📽️" },
  { href: "/calendar", label: "Calendrier", icon: "📅" },
  { href: "/notifications", label: "Notifications", icon: "🔔", showBadge: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // Silently fail — sidebar shouldn't break over notification fetch
      }
    }
    fetchUnread();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-border">
        <div className="text-primary font-bold text-lg">✦ WorshipFlow</div>
        <div className="text-muted-foreground text-xs mt-1">Église Elements Com</div>
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "text-primary bg-primary/10 border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {"showBadge" in item && item.showBadge && (
                <NotificationBadge count={unreadCount} />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <Link
          href="/settings"
          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <span>⚙️</span>
          <span>Paramètres</span>
        </Link>
      </div>
    </aside>
  );
}
