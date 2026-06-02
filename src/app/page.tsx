import Link from "next/link";
import {
  Music2, CalendarDays, Monitor, Users, Tag, ChevronRight,
  ArrowRight, CheckCircle2,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Planification de services",
    desc: "Créez des plans de service complets avec l'ordre du culte, les assignations d'équipe et les notes.",
  },
  {
    icon: Music2,
    title: "Bibliothèque de chants",
    desc: "Gérez vos chants avec paroles, grilles d'accords et transposition automatique en un clic.",
  },
  {
    icon: Monitor,
    title: "Intégration ProPresenter",
    desc: "Envoyez vos chants directement dans ProPresenter depuis n'importe quel appareil, sans toucher au clavier.",
  },
  {
    icon: Users,
    title: "Gestion d'équipe",
    desc: "Assignez des rôles, gérez les disponibilités et coordonnez votre équipe de louange efficacement.",
  },
  {
    icon: Tag,
    title: "Thèmes & catégories",
    desc: "Organisez vos chants par thèmes — Adoration, Noël, Pâques — pour les retrouver instantanément.",
  },
  {
    icon: ChevronRight,
    title: "Contrôle en direct",
    desc: "Pilotez ProPresenter depuis votre téléphone pendant le culte — diapo suivante, effacer l'écran.",
  },
];

const INCLUDED = [
  "Plans de service illimités",
  "Bibliothèque de chants illimitée",
  "Grilles d'accords + transposition",
  "Intégration ProPresenter",
  "Gestion des membres et rôles",
  "Rapport CCLI automatique",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">W</span>
            </div>
            <span className="font-semibold text-sm">ProSendWorship</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Se connecter
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Conçu pour les équipes de louange
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
          Gérez votre culte.<br className="hidden sm:block" />
          <span className="text-primary"> Simplement.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          ProSendWorship centralise la planification des services, la bibliothèque de chants et le contrôle de ProPresenter en une seule application.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Créer un compte gratuit
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="rounded-lg bg-muted w-9 h-9 flex items-center justify-center mb-4">
                <f.icon className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What's included */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Tout inclus</p>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Tout ce dont vous avez besoin,<br />rien de superflu.</h2>
            <p className="text-muted-foreground leading-relaxed">
              ProSendWorship est conçu spécifiquement pour les équipes de louange d&apos;église. Pas de fonctionnalités inutiles, juste ce qui vous aide à mieux servir chaque dimanche.
            </p>
          </div>
          <ul className="space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Prêt à simplifier votre planification ?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Rejoignez les équipes qui utilisent ProSendWorship pour préparer leur culte plus efficacement.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Commencer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} ProSendWorship — Église Elements Com</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">Connexion</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
