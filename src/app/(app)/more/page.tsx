import Link from "next/link";

const moreItems = [
  { href: "/propresenter", label: "Présentation", icon: "📽️" },
  { href: "/live", label: "Live Control", icon: "🎛️" },
  { href: "/rehearsal", label: "Répétition", icon: "🎸" },
  { href: "/calendar", label: "Calendrier", icon: "📅" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
  { href: "/settings", label: "Paramètres", icon: "⚙️" },
];

export default function MorePage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Menu</h1>
      <div className="space-y-2">
        {moreItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
