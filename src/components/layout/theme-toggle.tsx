"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground w-full px-0 py-1 transition-colors"
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      <span>{isDark ? "☀️" : "🌙"}</span>
      <span>{isDark ? "Mode clair" : "Mode sombre"}</span>
    </button>
  );
}
