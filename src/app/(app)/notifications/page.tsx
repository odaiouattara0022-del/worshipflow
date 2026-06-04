"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "@/components/notifications/notification-item";

interface Notification {
  id: string;
  type: string;
  message: string;
  sentAt: string;
  readAt: string | null;
  channel: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PUT" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);
  }

  async function handleDelete(id: string) {
    const target = notifications.find((n) => n.id === id);
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.readAt) setUnreadCount((c) => Math.max(0, c - 1));
  }

  const shown = filter === "unread" ? notifications.filter((n) => !n.readAt) : notifications;

  return (
    <div>
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
        action={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1 mt-4">
        {([["all", "Toutes"], ["unread", "Non lues"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent text-foreground"
            }`}
          >
            {label}{key === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        ))}
      </div>

      <Card className="mt-3">
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="p-4 space-y-1">
            {shown.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">🔔</p>
                <p className="mt-2">{filter === "unread" ? "Aucune notification non lue" : "Aucune notification"}</p>
              </div>
            ) : (
              shown.map((n) => (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  type={n.type}
                  message={n.message}
                  sentAt={n.sentAt}
                  readAt={n.readAt}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
