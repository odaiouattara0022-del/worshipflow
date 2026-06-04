"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobilePrimaryItems } from "@/components/layout/nav-items";

const bottomItems = [
  ...mobilePrimaryItems,
  { href: "/more", label: "Plus", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 px-1">
      {bottomItems.map(({ href, label, icon: Icon }) => {
        const active = href === "/more" ? pathname === "/more" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-0 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-[10px] leading-tight truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
