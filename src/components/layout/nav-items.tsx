// Single source of truth for navigation. The desktop sidebar, the mobile bottom
// bar, and the mobile "Plus" page all derive from this, so they can never drift
// (which is exactly how Thèmes/Église became unreachable on mobile before).

import type { ElementType } from "react";
import {
  LayoutDashboard, CalendarDays, Music2, Users, Tag, Calendar,
  Building2, Monitor, Radio, Mic2, Bell, Settings, User,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: ElementType;
}

export interface NavSection {
  label: string | null;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/dashboard",    label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/services",     label: "Services",        icon: CalendarDays },
      { href: "/songs",        label: "Chants",          icon: Music2 },
      { href: "/team",         label: "Équipe",          icon: Users },
      { href: "/themes",       label: "Thèmes",          icon: Tag },
      { href: "/calendar",     label: "Calendrier",      icon: Calendar },
      { href: "/church",       label: "Mon Église",      icon: Building2 },
    ],
  },
  {
    label: "Présentation",
    items: [
      { href: "/propresenter", label: "Appareils",       icon: Monitor },
      { href: "/live",         label: "Live Control",    icon: Radio },
      { href: "/rehearsal",    label: "Répétition",      icon: Mic2 },
    ],
  },
];

// Utility destinations — sidebar footer on desktop, bottom of the "Plus" page on mobile.
export const UTILITY_ITEMS: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings",      label: "Paramètres",    icon: Settings },
  { href: "/profile",       label: "Profil",        icon: User },
];

// The four primary destinations shown in the mobile bottom bar (the 5th slot is "Plus").
export const MOBILE_PRIMARY_HREFS = ["/dashboard", "/services", "/songs", "/team"];

const allItems = NAV_SECTIONS.flatMap((s) => s.items);

/** Items for the mobile bottom bar, in the order of MOBILE_PRIMARY_HREFS. */
export const mobilePrimaryItems: NavItem[] = MOBILE_PRIMARY_HREFS
  .map((href) => allItems.find((i) => i.href === href))
  .filter((i): i is NavItem => Boolean(i));

/** Everything the bottom bar doesn't show, for the "Plus" page — guarantees parity. */
export const moreSections: NavSection[] = [
  ...NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !MOBILE_PRIMARY_HREFS.includes(i.href)),
  })).filter((s) => s.items.length > 0),
  { label: "Compte", items: UTILITY_ITEMS },
];
