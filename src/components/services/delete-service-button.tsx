"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface DeleteServiceButtonProps {
  serviceId: string;
  serviceTitle: string;
  onDeleted?: () => void;        // editor: redirect; list: refresh
  variant?: "button" | "icon";   // header button vs small trash icon on a card
}

export function DeleteServiceButton({
  serviceId,
  serviceTitle,
  onDeleted,
  variant = "button",
}: DeleteServiceButtonProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e?: React.MouseEvent) {
    // On a card the button sits inside a <Link>: don't navigate.
    e?.preventDefault();
    e?.stopPropagation();

    const ok = await confirm({
      title: "Supprimer ce service ?",
      description: `« ${serviceTitle} » et tous ses éléments seront définitivement supprimés. Cette action est irréversible.`,
      confirmLabel: "Supprimer",
    });
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
    setLoading(false);

    if (res.ok) {
      toast.success("Service supprimé");
      onDeleted?.();
    } else {
      toast.error("Suppression impossible");
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          title="Supprimer le service"
          aria-label="Supprimer le service"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={loading}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Supprimer
        </Button>
      )}
      {ConfirmDialog}
    </>
  );
}
