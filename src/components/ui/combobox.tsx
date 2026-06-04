"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;  // shown faintly next to the label (e.g. song key)
  note?: string;  // shown on the right (e.g. "indisponible")
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
}

// Collapsed dropdown (combobox): a trigger button showing the current choice that
// expands a searchable list inline when clicked. Inline (not absolute) so it never
// gets clipped inside scrollable dialogs/sheets, and stays uncluttered when closed.
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Choisir…",
  searchPlaceholder = "Rechercher…",
  allowNone = false,
  noneLabel = "Aucun",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : value === "" && allowNone ? noneLabel : placeholder}
          {selected?.hint && <span className="text-muted-foreground"> · {selected.hint}</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1 rounded-lg border border-border bg-card shadow-md">
          <div className="relative p-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {allowNone && (
              <button
                type="button"
                onClick={() => choose("")}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors",
                  value === "" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
                )}
              >
                <span className="italic">{noneLabel}</span>
                {value === "" && <Check className="h-4 w-4 shrink-0" />}
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">Aucun résultat.</p>
            )}
            {filtered.slice(0, 200).map((o) => {
              const isSel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => choose(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors",
                    isSel ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
                  )}
                >
                  <span className="truncate font-medium">{o.label}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {(o.note || o.hint) && (
                      <span className={cn("text-xs", isSel ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {o.note || o.hint}
                      </span>
                    )}
                    {isSel && <Check className="h-4 w-4" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
