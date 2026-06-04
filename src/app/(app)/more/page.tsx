import Link from "next/link";
import { moreSections } from "@/components/layout/nav-items";

export default function MorePage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Menu</h1>
      <div className="space-y-5">
        {moreSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {section.label}
              </p>
            )}
            <div className="space-y-2">
              {section.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
