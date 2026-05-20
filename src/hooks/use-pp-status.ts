"use client";

import { useState, useEffect } from "react";

interface PPStatus {
  connected: boolean;
  version?: string;
}

export function usePPStatus(intervalMs = 15000): PPStatus {
  const [status, setStatus] = useState<PPStatus>({ connected: false });

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/propresenter/status");
        if (res.ok && active) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        if (active) setStatus({ connected: false });
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
