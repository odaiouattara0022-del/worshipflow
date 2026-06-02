"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DeviceManager } from "@/components/propresenter/device-selector";
import { MemberForm } from "@/components/team/member-form";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import {
  Settings, Monitor, BarChart3, Users, Bell,
  Palette, Download, Upload, Building2, Plus, Trash2, X,
} from "lucide-react";

interface SettingsMap { [key: string]: string; }
interface Member { id: string; name: string; email: string | null; phone: string | null; role: string; }
interface ServiceRole { id: string; name: string; color: string; sortOrder: number; }
interface Church { id: string; name: string; description?: string; address?: string; website?: string; logoUrl?: string; isPublic?: boolean; }

const DEFAULT_SETTINGS: SettingsMap = {
  churchName: "Mon Église", ccliLicense: "",
  smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "", smtpFrom: "",
  reminderDays: "7,3,1",
};

const TABS = [
  { key: "general",      label: "Général",         icon: Settings },
  { key: "church",       label: "Profil d'église",  icon: Building2, adminOnly: true },
  { key: "propresenter", label: "ProPresenter",     icon: Monitor },
  { key: "roles",        label: "Rôles de service", icon: Users, adminOnly: true },
  { key: "notifications",label: "Notifications",    icon: Bell },
  // { key: "email", label: "Email / SMTP", icon: Bell }, // désactivé temporairement
  { key: "appearance",   label: "Apparence",        icon: Palette },
  { key: "data",         label: "Données",          icon: Download },
  { key: "reporting",    label: "CCLI",             icon: BarChart3 },
  { key: "email",        label: "Email",            icon: Bell, adminOnly: true },
  { key: "members",      label: "Membres",          icon: Users, adminOnly: true },
  { key: "reminders",    label: "Rappels",          icon: Bell },
];

const ROLE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16"];

export default function SettingsPage() {
  const [tab, setTab]                 = useState("general");
  const [settings, setSettings]       = useState<SettingsMap>(DEFAULT_SETTINGS);
  const [saving, setSaving]           = useState(false);
  const [triggeringReminders, setTR]  = useState(false);
  const [members, setMembers]         = useState<Member[]>([]);
  const [roles, setRoles]             = useState<ServiceRole[]>([]);
  const [newRole, setNewRole]         = useState("");
  const [roleColor, setRoleColor]     = useState(ROLE_COLORS[0]);
  const [church, setChurch]           = useState<Church | null>(null);
  const [churchForm, setChurchForm]   = useState<Partial<Church>>({});
  const [savingChurch, setSavingChurch] = useState(false);
  const [notifChannels, setNotifChannels] = useState<string[]>(["IN_APP"]);
  const [savingNotif, setSavingNotif] = useState(false);
  const [importFile, setImportFile]   = useState<File | null>(null);
  const [importing, setImporting]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testingEmail, setTestingEmail]   = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const { user, isAdmin: isAppAdmin }  = useCurrentUser();
  const u = user as any;
  // Admin = app-level ADMIN  OR  church OWNER/ADMIN
  const isAdmin = isAppAdmin || ["OWNER", "ADMIN"].includes(u?.churchRole ?? "");

  function handleChange(k: string, v: string) { setSettings(p => ({ ...p, [k]: v })); }

  function loadMembers() { fetch("/api/team").then(r => r.json()).then(setMembers).catch(() => {}); }
  function loadRoles()   { fetch("/api/service-roles").then(r => r.json()).then(setRoles).catch(() => {}); }

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : {}).then(d => setSettings(p => ({ ...p, ...d }))).catch(() => {});
    loadMembers();
    loadRoles();
    fetch("/api/user/notifications").then(r => r.json()).then(d => { if (d.notifChannels) setNotifChannels(d.notifChannels.split(",").filter(Boolean)); }).catch(() => {});
    if (u?.churchId) {
      fetch(`/api/churches/${u.churchId}`).then(r => r.json()).then(c => { setChurch(c); setChurchForm(c); }).catch(() => {});
    }
  }, [u?.churchId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (res.ok) toast.success("Paramètres enregistrés"); else toast.error("Erreur");
    } catch { toast.error("Erreur"); } finally { setSaving(false); }
  }

  async function handleSaveChurch() {
    if (!church) return;
    setSavingChurch(true);
    try {
      const res = await fetch(`/api/churches/${church.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(churchForm) });
      if (res.ok) { toast.success("Profil sauvegardé"); const updated = await res.json(); setChurch(updated); }
      else toast.error("Erreur");
    } catch { toast.error("Erreur"); } finally { setSavingChurch(false); }
  }

  async function handleAddRole() {
    if (!newRole.trim()) return;
    const res = await fetch("/api/service-roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newRole.trim(), color: roleColor }) });
    if (res.ok) { toast.success("Rôle ajouté"); setNewRole(""); loadRoles(); }
  }

  async function handleDeleteRole(id: string) {
    await fetch(`/api/service-roles/${id}`, { method: "DELETE" });
    loadRoles();
  }

  async function handleSaveNotif() {
    setSavingNotif(true);
    try {
      await fetch("/api/user/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifChannels: notifChannels.join(",") }) });
      toast.success("Préférences sauvegardées");
    } catch { toast.error("Erreur"); } finally { setSavingNotif(false); }
  }

  async function confirmDeleteMember() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/team/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) { toast.success(`${deleteTarget.name} supprimé`); loadMembers(); }
    setDeleteTarget(null);
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    try {
      const form = new FormData(); form.append("file", importFile);
      const res = await fetch("/api/songs/import", { method: "POST", body: form });
      const d = await res.json();
      if (res.ok) toast.success(d.message ?? `${d.imported ?? 0} chants importés`);
      else toast.error(d.error ?? "Erreur lors de l'import");
      setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = "";
    } catch { toast.error("Erreur"); } finally { setImporting(false); }
  }

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);
  const saveableTabs = ["general", "reminders"];

  return (
    <div>
      <Header
        title="Paramètres"
        subtitle="Configuration de votre espace"
        action={saveableTabs.includes(tab) ? (
          <Button onClick={handleSave} disabled={saving} size="sm">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        ) : undefined}
      />

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-border mb-6 overflow-x-auto">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Général ─────────────────────────────────── */}
      {tab === "general" && (
        <div className="max-w-lg space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Application</h2>
            <div>
              <Label htmlFor="churchName">Nom de l&apos;église</Label>
              <Input id="churchName" value={settings.churchName} onChange={e => handleChange("churchName", e.target.value)} className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </Card>
        </div>
      )}

      {/* ── Profil d'église ──────────────────────────── */}
      {tab === "church" && isAdmin && (
        <div className="max-w-xl space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Profil public de l&apos;église</h2>
            <p className="text-xs text-muted-foreground">Ces informations apparaissent sur la page publique de votre église, accessible sans connexion.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de l&apos;église</Label>
                <Input value={churchForm.name ?? ""} onChange={e => setChurchForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <textarea value={churchForm.description ?? ""} onChange={e => setChurchForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Courte description de votre église…" className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <Label>Adresse</Label>
                <Input value={churchForm.address ?? ""} onChange={e => setChurchForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Rue de l'Église, Ville" className="mt-1" />
              </div>
              <div>
                <Label>Site web</Label>
                <Input value={churchForm.website ?? ""} onChange={e => setChurchForm(p => ({ ...p, website: e.target.value }))} placeholder="https://mon-eglise.com" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>URL du logo</Label>
                <Input value={churchForm.logoUrl ?? ""} onChange={e => setChurchForm(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://…/logo.png" className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isPublic" checked={churchForm.isPublic ?? true} onChange={e => setChurchForm(p => ({ ...p, isPublic: e.target.checked }))} className="rounded" />
              <Label htmlFor="isPublic" className="cursor-pointer">Page publique visible (recherchable par les visiteurs)</Label>
            </div>
            <Button onClick={handleSaveChurch} disabled={savingChurch}>{savingChurch ? "Sauvegarde…" : "Sauvegarder le profil"}</Button>
            {church && (
              <p className="text-xs text-muted-foreground">
                Page publique : <a href={`/churches/${church.id}`} target="_blank" rel="noopener noreferrer" className="underline">/churches/{church.id}</a>
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── ProPresenter ─────────────────────────────── */}
      {tab === "propresenter" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-1">Appareils connectés</h2>
            <p className="text-xs text-muted-foreground mb-4">L&apos;agent pp-agent.exe gère la connexion. Téléchargez-le depuis la section Paramètres → ProPresenter d&apos;un appareil pour l&apos;installer.</p>
            <DeviceManager />
          </Card>
        </div>
      )}

      {/* ── Rôles de service ──────────────────────────── */}
      {tab === "roles" && isAdmin && (
        <div className="max-w-lg space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Rôles de service</h2>
            <p className="text-xs text-muted-foreground">Définissez les rôles disponibles pour l&apos;assignation des membres dans vos services (Son, Projection, Louange, etc.).</p>
            <div className="flex gap-2 flex-wrap">
              <Input value={newRole} onChange={e => setNewRole(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddRole()} placeholder="Nom du rôle…" className="flex-1 h-9 text-sm min-w-32" />
              <div className="flex gap-1">
                {ROLE_COLORS.map(c => (
                  <button key={c} onClick={() => setRoleColor(c)}
                    className={cn("h-6 w-6 rounded-full border-2 transition-transform", roleColor === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <Button size="sm" onClick={handleAddRole} disabled={!newRole.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" />Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {roles.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="flex-1 text-sm font-medium">{r.name}</span>
                  <button onClick={() => handleDeleteRole(r.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {roles.length === 0 && <p className="text-sm text-muted-foreground">Aucun rôle défini. Ajoutez vos premiers rôles ci-dessus.</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── Notifications ─────────────────────────────── */}
      {tab === "notifications" && (
        <div className="max-w-lg space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Canaux de notification</h2>
            <p className="text-xs text-muted-foreground">Choisissez comment vous souhaitez être notifié pour les assignations et rappels.</p>
            {[
              { value: "IN_APP", label: "Dans l'application", desc: "Notifications visibles dans la cloche en haut" },
              { value: "EMAIL",  label: "Par email",          desc: "Reçu à l'adresse email de votre profil" },
            ].map(ch => (
              <label key={ch.value} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={notifChannels.includes(ch.value)}
                  onChange={e => setNotifChannels(prev => e.target.checked ? [...prev, ch.value] : prev.filter(c => c !== ch.value))}
                  className="mt-0.5 rounded" />
                <div>
                  <p className="text-sm font-medium">{ch.label}</p>
                  <p className="text-xs text-muted-foreground">{ch.desc}</p>
                </div>
              </label>
            ))}
            <Button onClick={handleSaveNotif} disabled={savingNotif} size="sm">{savingNotif ? "Sauvegarde…" : "Enregistrer"}</Button>
          </Card>
        </div>
      )}

      {/* ── Email / SMTP ──────────────────────────────── */}
      {tab === "email" && (
        <div className="max-w-lg space-y-4">
          {/* Simple: Resend */}
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Envoi d&apos;emails</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilisez <strong>Resend</strong> — gratuit jusqu&apos;à 3 000 emails/mois, aucune configuration technique.
                </p>
              </div>
              <a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors whitespace-nowrap">
                Créer un compte →
              </a>
            </div>

            <ol className="text-xs text-muted-foreground space-y-1 list-none">
              <li>① Créez un compte gratuit sur <strong>resend.com</strong></li>
              <li>② Copiez votre clé API (commence par <code className="bg-muted px-1 rounded">re_</code>)</li>
              <li>③ Collez-la ci-dessous et enregistrez</li>
            </ol>

            <div className="space-y-3">
              <div>
                <Label>Clé API Resend</Label>
                <Input
                  type="text"
                  value={settings.resendApiKey ?? ""}
                  onChange={e => handleChange("resendApiKey", e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label>Adresse d&apos;expédition</Label>
                <Input
                  value={settings.smtpFrom ?? ""}
                  onChange={e => handleChange("smtpFrom", e.target.value)}
                  placeholder="noreply@mon-eglise.com"
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Doit correspondre à un domaine vérifié dans Resend, ou utilisez <code className="bg-muted px-1 rounded">onboarding@resend.dev</code> pour les tests.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Enregistrement…" : "Enregistrer la clé"}
              </Button>

              <div className="border-t border-border pt-3">
                <Label className="text-xs">Adresse de test</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="email"
                    value={testEmailAddr || (user as any)?.email || ""}
                    onChange={e => setTestEmailAddr(e.target.value)}
                    placeholder="votre@email.com"
                    className="flex-1 h-9 text-sm"
                  />
                  <Button variant="outline" size="sm" disabled={testingEmail}
                    onClick={async () => {
                      setTestingEmail(true);
                      const to = testEmailAddr || (user as any)?.email;
                      try {
                        const res = await fetch("/api/settings/test-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ to }),
                        });
                        const d = await res.json();
                        if (d.ok) toast.success(`Email envoyé à ${to} ✓`);
                        else toast.error(d.error ?? "Erreur");
                      } catch { toast.error("Erreur de connexion"); }
                      finally { setTestingEmail(false); }
                    }}>
                    {testingEmail ? "Envoi…" : "Tester"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Advanced: SMTP collapsible */}
          <details className="rounded-xl border border-border bg-card overflow-hidden">
            <summary className="px-6 py-4 text-sm font-medium cursor-pointer hover:bg-accent/50 transition-colors select-none">
              Configuration SMTP avancée (Gmail, Outlook…)
            </summary>
            <div className="px-6 pb-6 pt-2 space-y-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Pour Gmail : activez la validation en 2 étapes puis créez un <em>App Password</em> dans Sécurité → Mots de passe des applications.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-xs">Hôte SMTP</Label><Input value={settings.smtpHost ?? ""} onChange={e => handleChange("smtpHost", e.target.value)} placeholder="smtp.gmail.com" className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">Port</Label><Input value={settings.smtpPort ?? "587"} onChange={e => handleChange("smtpPort", e.target.value)} placeholder="587" className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">Utilisateur</Label><Input value={settings.smtpUser ?? ""} onChange={e => handleChange("smtpUser", e.target.value)} placeholder="user@gmail.com" className="mt-1 h-8 text-sm" /></div>
                <div className="col-span-2"><Label className="text-xs">Mot de passe / App Password</Label><Input type="password" value={settings.smtpPass ?? ""} onChange={e => handleChange("smtpPass", e.target.value)} className="mt-1 h-8 text-sm" /></div>
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "…" : "Enregistrer SMTP"}</Button>
            </div>
          </details>
        </div>
      )}

      {/* ── Apparence ─────────────────────────────────── */}
      {tab === "appearance" && (
        <div className="max-w-lg space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Thème</h2>
            <p className="text-xs text-muted-foreground">Choisissez le mode d&apos;affichage de l&apos;application.</p>
            <div className="w-fit">
              <ThemeToggle />
            </div>
          </Card>
        </div>
      )}

      {/* ── Données ───────────────────────────────────── */}
      {tab === "data" && (
        <div className="max-w-lg space-y-4">
          {/* Export */}
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Download className="h-4 w-4" />Exporter</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Chants</p>
                <p className="text-xs text-muted-foreground mb-2">Exportez toute votre bibliothèque de chants</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => window.open("/api/songs/export?format=json", "_blank")}>JSON</Button>
                  <Button variant="outline" size="sm" onClick={() => window.open("/api/songs/export?format=csv", "_blank")}>CSV</Button>
                  <Button variant="outline" size="sm" onClick={() => window.open("/api/songs/export?format=text", "_blank")}>Texte</Button>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium">Rapport CCLI</p>
                <p className="text-xs text-muted-foreground mb-2">Utilisation des chants cette année</p>
                <Button variant="outline" size="sm" onClick={() => { const y = new Date().getFullYear(); window.open(`/api/ccli-report?from=${y}-01-01&to=${y}-12-31&format=csv`, "_blank"); }}>CSV CCLI {new Date().getFullYear()}</Button>
              </div>
            </div>
          </Card>

          {/* Import */}
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Importer des chants</h2>
            <p className="text-xs text-muted-foreground">Importez des chants depuis un fichier JSON exporté précédemment, ou un fichier CSV (titre, auteur, paroles).</p>
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={e => setImportFile(e.target.files?.[0] ?? null)} className="hidden" id="importFile" />
                <label htmlFor="importFile" className="cursor-pointer">
                  {importFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium">{importFile.name}</span>
                      <button onClick={e => { e.preventDefault(); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">Cliquez pour sélectionner un fichier</p>
                      <p className="text-xs text-muted-foreground mt-1">.json ou .csv</p>
                    </div>
                  )}
                </label>
              </div>
              {importFile && (
                <Button onClick={handleImport} disabled={importing} className="w-full">
                  {importing ? "Import en cours…" : `Importer ${importFile.name}`}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── CCLI ──────────────────────────────────────── */}
      {tab === "reporting" && (
        <div className="max-w-lg space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Licence CCLI</h2>
            <div>
              <Label htmlFor="ccliLicense">Numéro de licence</Label>
              <Input id="ccliLicense" value={settings.ccliLicense} onChange={e => handleChange("ccliLicense", e.target.value)} placeholder="ex: 1234567" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Affiché dans ProPresenter lors de l&apos;envoi des chants.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
              <Button variant="ghost" size="sm" onClick={async () => {
                const y = new Date().getFullYear();
                const res = await fetch(`/api/ccli-report?from=${y}-01-01&to=${y}-12-31`);
                if (res.ok) { const d = await res.json(); toast.info(`${d.totalSongs} chants utilisés ${d.totalUses} fois cette année`); }
              }}>Voir les stats</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Membres ───────────────────────────────────── */}
      {tab === "members" && isAdmin && (
        <div className="max-w-lg space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Membres de l&apos;équipe</h2>
              <MemberForm trigger={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>} onSuccess={loadMembers} />
            </div>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}{m.email ? ` · ${m.email}` : ""}</p>
                  </div>
                  <button onClick={() => setDeleteTarget({ id: m.id, name: m.name })} className="text-xs text-destructive hover:underline ml-3 shrink-0">Supprimer</button>
                </div>
              ))}
              {members.length === 0 && <p className="text-sm text-muted-foreground">Aucun membre</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── Rappels ───────────────────────────────────── */}
      {tab === "reminders" && (
        <div className="max-w-lg space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Rappels automatiques</h2>
            <div>
              <Label htmlFor="reminderDays">Jours avant le service</Label>
              <Input id="reminderDays" value={settings.reminderDays} onChange={e => handleChange("reminderDays", e.target.value)} placeholder="7,3,1" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Séparés par des virgules — ex: 7,3,1 pour J-7, J-3, J-1</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
              <Button variant="outline" size="sm" onClick={async () => {
                setTR(true);
                const res = await fetch("/api/reminders", { method: "POST" });
                if (res.ok) { const d = await res.json(); toast.success(`${d.remindersSent} rappel${d.remindersSent !== 1 ? "s" : ""} envoyé${d.remindersSent !== 1 ? "s" : ""}`); }
                else toast.error("Erreur");
                setTR(false);
              }} disabled={triggeringReminders}>{triggeringReminders ? "Envoi…" : "Envoyer maintenant"}</Button>
            </div>
          </Card>
        </div>
      )}
      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le membre</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" size="sm" onClick={confirmDeleteMember}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
