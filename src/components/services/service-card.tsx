import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DeleteServiceButton } from "@/components/services/delete-service-button";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  READY: { label: "Prêt", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  DONE: { label: "Terminé", className: "bg-primary/10 text-primary border-primary/20" },
};

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    date: string | Date;
    type: string;
    status: string;
    _count: { items: number; assignments: number };
  };
  onDeleted?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ServiceCard({ service, onDeleted, selectable, selected, onToggleSelect }: ServiceCardProps) {
  const statusCfg = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.DRAFT;
  const dateStr = format(new Date(service.date), "EEEE d MMMM yyyy", { locale: fr });

  const body = (
    <CardContent className="p-4">
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold">{service.title}</h3>
        <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1 capitalize">{dateStr}</p>
      <div className="flex gap-2 mt-3 items-center">
        <Badge variant="outline" className="text-xs">{service.type}</Badge>
        <span className="text-xs text-muted-foreground">
          {service._count.items} élément{service._count.items !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground">
          {service._count.assignments} membre{service._count.assignments !== 1 ? "s" : ""}
        </span>
      </div>
    </CardContent>
  );

  // Selection mode: the whole card toggles selection (no navigation), with a checkbox.
  if (selectable) {
    return (
      <button type="button" onClick={onToggleSelect} className="relative block w-full text-left">
        <span
          className={cn(
            "absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded border",
            selected ? "bg-primary border-primary text-primary-foreground" : "bg-background border-input"
          )}
        >
          {selected && <Check className="h-3.5 w-3.5" />}
        </span>
        <Card className={cn("transition-colors", selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/50")}>
          <div className="pl-6">{body}</div>
        </Card>
      </button>
    );
  }

  return (
    <div className="relative">
      <Link href={`/services/${service.id}`}>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">{body}</Card>
      </Link>
      {onDeleted && (
        <div className="absolute bottom-2 right-2">
          <DeleteServiceButton
            serviceId={service.id}
            serviceTitle={service.title}
            onDeleted={onDeleted}
            variant="icon"
          />
        </div>
      )}
    </div>
  );
}
