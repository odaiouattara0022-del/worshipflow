import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, Users, MapPin, Globe, ArrowRight } from "lucide-react";

export default async function PublicChurchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const church = await prisma.church.findUnique({
    where: { id },
    include: { _count: { select: { members: true, services: true } } },
  }) as any;

  if (!church || church.isPublic === false) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-sm font-medium">ProSendWorship</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Se connecter</Link>
            <Link href="/register" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Rejoindre</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Church header */}
        <div className="flex items-start gap-6 mb-10">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-3xl font-bold text-primary">
            {church.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{church.name}</h1>
            {church.description && (
              <p className="text-muted-foreground mt-2 max-w-xl">{church.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {church.address && (
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{church.address}</span>
              )}
              {church.website && (
                <a href={church.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
                  <Globe className="h-3.5 w-3.5" />{church.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />{church._count?.members ?? 0} membre{(church._count?.members ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Building2 className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-40" />
          <h2 className="text-xl font-semibold mb-2">Rejoindre {church.name}</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Créez un compte ProSendWorship, puis recherchez cette église pour envoyer votre demande d&apos;adhésion.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/register?church=${id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Créer un compte <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/login?church=${id}`} className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
