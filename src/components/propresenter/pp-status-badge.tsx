"use client";

import { usePPStatus } from "@/hooks/use-pp-status";

export function PPStatusBadge() {
  const { connected, version } = usePPStatus();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        connected
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {connected ? "Connecté" : "Déconnecté"}
      {connected && version && (
        <span className="text-[10px] opacity-70">({version})</span>
      )}
    </span>
  );
}
