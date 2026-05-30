"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DuplicateServiceButtonProps {
  serviceId: string;
  serviceTitle: string;
}

export function DuplicateServiceButton({ serviceId, serviceTitle }: DuplicateServiceButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(`${serviceTitle} (copie)`);
  const [date, setDate] = useState("");

  async function handleDuplicate(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date }),
      });

      if (res.ok) {
        const newService = await res.json();
        toast.success("Service dupliqué !");
        setOpen(false);
        router.push(`/services/${newService.id}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la duplication");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Dupliquer</Button>} />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Dupliquer ce service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleDuplicate} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Nouvelle date *</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tous les éléments (chants, prières, etc.) seront copiés. Les assignations d&apos;équipe ne sont pas copiées.
          </p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Duplication..." : "Dupliquer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
