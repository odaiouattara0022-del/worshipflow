import { Header } from "@/components/layout/header";

export default function DashboardPage() {
  return (
    <div>
      <Header title="Tableau de bord" subtitle={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
      <p className="text-muted-foreground">Dashboard à venir...</p>
    </div>
  );
}
