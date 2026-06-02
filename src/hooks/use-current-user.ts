"use client";

import { useState, useEffect } from "react";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  churchId: string | null;
  churchRole: string | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return {
    user,
    loading,
    isAdmin: user?.role === "ADMIN",
    isLeader: user?.role === "LEADER" || user?.role === "ADMIN",
  };
}
