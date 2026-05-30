"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/services", label: "Services", icon: "📋" },
  { href: "/songs", label: "Chants", icon: "🎵" },
  { href: "/team", label: "Équipe", icon: "👥" },
  { href: "/propresenter", label: "ProPresenter", icon: "📽️" },
  { href: "/live", label: "Live Control", icon: "🎛️" },
  { href: "/rehearsal", label: "Répétition", icon: "🎸" },
  { href: "/calendar", label: "Calendrier", icon: "📅" },
  { href: "/notifications", label: "Notifications", icon: "🔔", showBadge: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // Silently fail
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-primary font-bold text-lg">✦ ProSendWorship</div>
          <div className="text-muted-foreground text-xs mt-1">Église Elements Com</div>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-muted-foreground hover:text-foreground text-2xl leading-none p-1"
          aria-label="Fermer le menu"
        >
          ✕
        </button>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
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
      <div className="p-4 border-t border-border space-y-2">
        <ThemeToggle />
        <Link
          href="/settings"
          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <span>⚙️</span>
          <span>Paramètres</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border flex items-center px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-foreground text-2xl leading-none p-1 mr-3"
          aria-label="Ouvrir le menu"
        >
          ☰
        </button>
        <span className="text-primary font-bold text-lg">✦ ProSendWorship</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile: slide-in overlay, desktop: fixed */}
      <aside
        className={cn(
          "bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0 z-50 w-64 transition-transform duration-200",
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "md:translate-x-0 md:w-56"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
