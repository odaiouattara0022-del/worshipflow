"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ServiceItemRow } from "@/components/services/service-item-row";
import { ItemDetailPanel } from "@/components/services/item-detail-panel";
import { AddItemDialog } from "@/components/services/add-item-dialog";
import { SendToPPButton } from "@/components/services/send-to-pp-button";
import { DuplicateServiceButton } from "@/components/services/duplicate-service-button";

interface Song {
  id: string;
  title: string;
  defaultKey: string;
}

interface User {
  id: string;
  name: string;
}

interface ServiceItem {
  id: string;
  type: string;
  title: string;
  order: number;
  duration: number;
  songId: string | null;
  assigneeId: string | null;
  notes: string | null;
  song: { title: string; defaultKey: string } | null;
  assignee: { id: string; name: string } | null;
}

interface Service {
  id: string;
  title: string;
  date: string;
  type: string;
  status: string;
  items: ServiceItem[];
}

const STATUS_TRANSITIONS: Record<string, { next: string; label: string }> = {
  DRAFT: { next: "READY", label: "Marquer Prêt" },
  READY: { next: "DONE", label: "Marquer Terminé" },
  DONE: { next: "DRAFT", label: "Repasser en Brouillon" },
};

export default function ServiceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchService = useCallback(async () => {
    const res = await fetch(`/api/services/${id}`);
    if (!res.ok) return;
    const data: Service = await res.json();
    setService(data);
    setItems(data.items);
  }, [id]);

  useEffect(() => {
    fetchService();

    fetch("/api/songs")
      .then((r) => r.json())
      .then((data) => setSongs(data));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(() => {
        // Fetch all users for assignee selection
        // Since there's no /api/team, we'll query users from the service assignments
        // For now, we use a simple approach
      });
  }, [fetchService]);

  // Fetch users list - using prisma users via a simple endpoint
  useEffect(() => {
    // Try to load users from available sources
    fetch("/api/services/" + id)
      .then((r) => r.json())
      .then((data) => {
        if (data.assignments) {
          const uniqueUsers = new Map<string, User>();
          for (const a of data.assignments) {
            if (a.user) uniqueUsers.set(a.user.id, a.user);
          }
          // Also add assignees from items
          for (const item of data.items) {
            if (item.assignee) uniqueUsers.set(item.assignee.id, item.assignee);
          }
          setUsers(Array.from(uniqueUsers.values()));
        }
      });
  }, [id]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    await fetch(`/api/services/${id}/items/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
    });
  }

  async function handleStatusChange() {
    if (!service) return;
    const transition = STATUS_TRANSITIONS[service.status];
    if (!transition) return;

    const res = await fetch(`/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: transition.next }),
    });
    if (res.ok) {
      const updated = await res.json();
      setService(updated);
    }
  }

  function handleItemSaved(updated: ServiceItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleItemDeleted(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSelectedItemId(null);
  }

  function handleItemAdded(item: Record<string, unknown>) {
    setItems((prev) => [...prev, item as unknown as ServiceItem]);
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const totalDuration = items.reduce((sum, i) => sum + i.duration, 0);
  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
  const statusTransition = STATUS_TRANSITIONS[service.status];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/services")}
            className="text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            &larr; Services
          </button>
          <h1 className="text-2xl font-bold">{service.title}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(service.date), "EEEE d MMMM yyyy", { locale: fr })}
            {" — "}
            {totalDuration} min au total
          </p>
        </div>
        <div className="flex gap-2">
          {statusTransition && (
            <Button variant="outline" onClick={handleStatusChange}>
              {statusTransition.label}
            </Button>
          )}
          <DuplicateServiceButton serviceId={service.id} serviceTitle={service.title} />
          <SendToPPButton serviceId={service.id} />
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-6">
        {/* Left: sortable list */}
        <div className="flex-1 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <ServiceItemRow
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedItemId}
                  onClick={() => setSelectedItemId(item.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <AddItemDialog serviceId={service.id} onItemAdded={handleItemAdded} />

          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun élément dans ce service</p>
              <p className="text-sm">Ajoutez des éléments pour construire votre déroulement</p>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="w-72 shrink-0">
          {selectedItem ? (
            <ItemDetailPanel
              item={selectedItem}
              serviceId={service.id}
              songs={songs}
              users={users}
              onSave={handleItemSaved}
              onDelete={handleItemDeleted}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sélectionnez un élément pour voir ses détails
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
