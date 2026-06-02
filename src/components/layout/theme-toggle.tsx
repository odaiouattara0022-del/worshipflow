"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors w-full",
      )}
      title={isDark ? "Mode clair" : "Mode sombre"}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact && <span>{isDark ? "Mode clair" : "Mode sombre"}</span>}
      {compact && <span>{isDark ? "Clair" : "Sombre"}</span>}
    </button>
  );
}
