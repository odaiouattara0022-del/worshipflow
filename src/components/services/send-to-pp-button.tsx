"use client";

import { Button } from "@/components/ui/button";

interface SendToPPButtonProps {
  serviceId: string;
}

export function SendToPPButton({ serviceId }: SendToPPButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        // Placeholder - will be wired in Task 11
        void serviceId;
        alert("ProPresenter sync sera disponible prochainement.");
      }}
    >
      Envoyer à ProPresenter
    </Button>
  );
}
