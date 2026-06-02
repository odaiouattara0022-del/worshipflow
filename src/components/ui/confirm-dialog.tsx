"use client";

import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use the destructive (red) style for the confirm button. Default: true. */
  destructive?: boolean;
}

/**
 * Drop-in replacement for the native `confirm()` that respects the app theme
 * and works reliably on mobile (where some browsers block native confirm()).
 *
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   ...
 *   if (!(await confirm({ title: "Supprimer ?", description: "..." }))) return;
 *   ...
 *   return (<>{...page...}{ConfirmDialog}</>);
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions = {}) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setOpen(false);
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  const ConfirmDialog = (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(false); }}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{opts.title ?? "Confirmer"}</DialogTitle>
        </DialogHeader>
        {opts.description && (
          <p className="text-sm text-muted-foreground">{opts.description}</p>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => close(false)}>
            {opts.cancelLabel ?? "Annuler"}
          </Button>
          <Button
            variant={opts.destructive === false ? "default" : "destructive"}
            size="sm"
            onClick={() => close(true)}
          >
            {opts.confirmLabel ?? "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
