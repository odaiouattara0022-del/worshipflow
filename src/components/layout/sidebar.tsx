"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  LayoutDashboard, CalendarDays, Music2, Tag, Monitor,
  Radio, Mic2, Calendar, Bell, Settings, ChevronRight,
  LogOut, User, ChevronUp, Building2,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard",    label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/services",     label: "Services",         icon: CalendarDays },
      { href: "/songs",        label: "Chants",           icon: Music2 },
      { href: "/themes",       label: "Thèmes",           icon: Tag },
      { href: "/calendar",     label: "Calendrier",       icon: Calendar },
      { href: "/church",       label: "Mon Église",       icon: Building2 },
    ],
  },
  {
    label: "Présentation",
    items: [
      { href: "/propresenter", label: "Appareils",         icon: Monitor },
      { href: "/live",         label: "Live Control",     icon: Radio },
      { href: "/rehearsal",    label: "Répétition",       icon: Mic2 },
    ],
  },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  pathname: string;
}

function NavItem({ href, label, icon: Icon, badge, pathname }: NavItemProps) {
  const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {isActive && <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
    </Link>
  );
}

function UserMenu() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-accent/60 transition-colors"
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium truncate">{user?.name ?? "…"}</p>
          <p className="text-[10px] text-muted-foreground truncate capitalize">{user?.role?.toLowerCase() ?? ""}</p>
        </div>
        <ChevronUp className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email ?? "Aucun email"}</p>
          </div>
          <div className="p-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Mon profil
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Paramètres
            </Link>
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/notifications?unread=true")
      .then((r) => r.json())
      .then((d) => setUnread(d.unreadCount ?? 0))
      .catch(() => {});
    const id = setInterval(() => {
      fetch("/api/notifications?unread=true")
        .then((r) => r.json())
        .then((d) => setUnread(d.unreadCount ?? 0))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-primary-foreground">W</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">ProSendWorship</p>
          <p className="text-[10px] text-muted-foreground truncate leading-none">Église Elements Com</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-4")}>
            {group.label && (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} pathname={pathname} {...item} />
              ))}
            </div>
          </div>
        ))}

        {/* Notifications with badge */}
        <div className="mt-0.5">
          <NavItem href="/notifications" label="Notifications" icon={Bell} badge={unread} pathname={pathname} />
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-0.5">
        <ThemeToggle compact />
        <UserMenu />
      </div>
    </div>
  );

  return (
    <aside className="hidden md:flex w-56 flex-col bg-sidebar border-r border-border h-screen fixed left-0 top-0 z-30">
      {content}
    </aside>
  );
}
