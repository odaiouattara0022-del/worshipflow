import Link from "next/link";

const mobileNavItems = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/services", label: "Services", icon: "📋" },
  { href: "/songs", label: "Chants", icon: "🎵" },
  { href: "/team", label: "Équipe", icon: "👥" },
  { href: "/more", label: "Plus", icon: "⋯" },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 px-1">
      {mobileNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary px-2 py-1 min-w-0"
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-[10px] leading-tight truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
