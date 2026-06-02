"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import {
  Building2, Users, Search, Plus, Send, Check, X, Copy,
  MessageSquare, ChevronDown, ChevronUp, Shield, Bell,
  BarChart3, Calendar, UserCheck, Network, ExternalLink,
  Megaphone, ChevronRight, Trash2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Church { id: string; name: string; description?: string; inviteCode?: string; address?: string; website?: string; isPublic?: boolean; members?: Member[]; _count?: { members: number }; }
interface Member { id: string; name: string; role: string; churchRole: string; email?: string; instruments?: string; onboardingCompleted?: boolean; }
interface JoinReq { id: string; status: string; user: { id: string; name: string; email?: string }; messages: Message[]; }
interface Message { id: string; content: string; createdAt: string; sender: { id: string; name: string }; }
interface Announcement { id: string; title: string; content: string; category: string; createdAt: string; author: { id: string; name: string }; }
interface Stats { totalMembers: number; totalServices: number; servicesThisYear: number; upcomingServices: number; onboardingRate: number; members: Member[]; }
interface AvailData { members: Member[]; services: { id: string; title: string; date: string }[]; availabilities: { userId: string; date: string; available: boolean }[]; }

const TABS = [
  { key: "overview",      label: "Vue d'ensemble", icon: BarChart3 },
  { key: "announcements", label: "Annonces",        icon: Megaphone },
  { key: "team",          label: "Équipe",          icon: Users },
  { key: "availability",  label: "Disponibilités",  icon: Calendar },
  { key: "onboarding",    label: "Onboarding",      icon: UserCheck },
  { key: "network",       label: "Réseau",          icon: Network },
];

const CATEGORIES = [
  { value: "general",    label: "Général" },
  { value: "service",    label: "Service" },
  { value: "formation",  label: "Formation" },
  { value: "evenement",  label: "Événement" },
];

const INSTRUMENTS = ["Guitare", "Basse", "Batterie", "Piano/Clavier", "Violon", "Voix", "Trompette", "Saxophone", "Flûte", "Cor", "Contrebasse", "Ukulélé", "Mandoline", "Banjo", "Autre"];

// ── Main component ───────────────────────────────────────────────────────────
export default function ChurchPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [church, setChurch]           = useState<Church | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinReq[]>([]);
  const [myRequest, setMyRequest]     = useState<JoinReq | null>(null);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState("overview");

  // Create/join
  const [newName, setNewName]   = useState("");
  const [newDesc, setNewDesc]   = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQ, setSearchQ]   = useState("");
  const [searchResults, setSearchResults] = useState<Church[]>([]);
  const [joining, setJoining]   = useState<string | null>(null);

  // Chat
  const [openReqId, setOpenReqId] = useState<string | null>(null);
  const [msgText, setMsgText]     = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle]   = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annCat, setAnnCat]       = useState("general");
  const [postingAnn, setPostingAnn] = useState(false);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Availability
  const [availData, setAvailData] = useState<AvailData | null>(null);

  // Onboarding
  const [myInstruments, setMyInstruments] = useState<string[]>([]);
  const [myBio, setMyBio]               = useState("");
  const [savingOnb, setSavingOnb]       = useState(false);

  // Network
  const [networkQ, setNetworkQ]         = useState("");
  const [networkResults, setNetworkResults] = useState<any[]>([]);
  const [myNetworks, setMyNetworks]     = useState<any[]>([]);
  const [joiningNet, setJoiningNet]     = useState<string | null>(null);
  const [newNetName, setNewNetName]     = useState("");
  const [creatingNet, setCreatingNet]   = useState(false);

  const isAdmin = ["OWNER", "ADMIN"].includes((user as any)?.churchRole ?? "");
  const u = user as any;

  const loadData = useCallback(async () => {
    if (!u) return;
    setLoading(true);
    try {
      if (u.churchId) {
        const [cRes, rRes] = await Promise.all([
          fetch(`/api/churches/${u.churchId}`),
          isAdmin ? fetch(`/api/churches/${u.churchId}/join-requests`) : Promise.resolve(null),
        ]);
        if (cRes.ok) setChurch(await cRes.json());
        if (rRes?.ok) setJoinRequests(await rRes.json());
      } else {
        const r = await fetch("/api/churches/my-request");
        if (r.ok) setMyRequest(await r.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [u?.churchId, isAdmin]);

  useEffect(() => { if (!userLoading) loadData(); }, [userLoading, loadData]);

  // Load tab-specific data
  useEffect(() => {
    if (!u?.churchId) return;
    if (tab === "announcements") fetch(`/api/churches/${u.churchId}/announcements`).then(r => r.json()).then(setAnnouncements).catch(() => {});
    if (tab === "overview" && isAdmin) fetch(`/api/churches/${u.churchId}/stats`).then(r => r.json()).then(setStats).catch(() => {});
    if (tab === "availability") fetch(`/api/churches/${u.churchId}/availability?weeks=4`).then(r => r.json()).then(setAvailData).catch(() => {});
    if (tab === "onboarding") {
      setMyInstruments((u.instruments ?? "").split(",").filter(Boolean));
      setMyBio(u.bio ?? "");
    }
  }, [tab, u?.churchId]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/churches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }) });
      if (!res.ok) { toast.error((await res.json()).error); return; }
      toast.success("Église créée !"); window.location.reload();
    } catch { toast.error("Erreur"); } finally { setCreating(false); }
  }

  async function handleSearch() {
    if (searchQ.trim().length < 2) return;
    const r = await fetch(`/api/churches?q=${encodeURIComponent(searchQ)}`);
    setSearchResults(await r.json());
  }

  async function handleJoin(churchId: string) {
    setJoining(churchId);
    try {
      const res = await fetch(`/api/churches/${churchId}/join-requests`, { method: "POST" });
      if (!res.ok) { toast.error((await res.json()).error); return; }
      toast.success("Demande envoyée"); window.location.reload();
    } catch { toast.error("Erreur"); } finally { setJoining(null); }
  }

  async function handleDecision(reqId: string, action: "approve" | "reject") {
    if (!church) return;
    const res = await fetch(`/api/churches/${church.id}/join-requests/${reqId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (res.ok) { toast.success(action === "approve" ? "Membre accepté" : "Demande refusée"); loadData(); }
  }

  async function handleSendMessage(reqId: string, churchId: string) {
    if (!msgText.trim()) return;
    setSendingMsg(true);
    try {
      await fetch(`/api/churches/${churchId}/join-requests/${reqId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msgText.trim() }) });
      setMsgText(""); loadData();
    } catch { toast.error("Erreur"); } finally { setSendingMsg(false); }
  }

  async function handlePostAnn() {
    if (!annTitle.trim() || !annContent.trim() || !church) return;
    setPostingAnn(true);
    try {
      const res = await fetch(`/api/churches/${church.id}/announcements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: annTitle, content: annContent, category: annCat }) });
      if (!res.ok) { toast.error("Erreur"); return; }
      toast.success("Annonce publiée");
      setAnnTitle(""); setAnnContent(""); setAnnCat("general");
      fetch(`/api/churches/${church.id}/announcements`).then(r => r.json()).then(setAnnouncements);
    } catch { toast.error("Erreur"); } finally { setPostingAnn(false); }
  }

  async function handleDeleteAnn(annId: string) {
    if (!church) return;
    await fetch(`/api/churches/${church.id}/announcements`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ annId }) });
    setAnnouncements(prev => prev.filter(a => a.id !== annId));
  }

  async function handleSaveOnboarding() {
    setSavingOnb(true);
    try {
      const res = await fetch("/api/user/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruments: myInstruments.join(","), bio: myBio, onboardingCompleted: myInstruments.length > 0 }) });
      if (res.ok) toast.success("Profil d'équipe sauvegardé");
    } catch { toast.error("Erreur"); } finally { setSavingOnb(false); }
  }

  async function handleSearchNetwork() {
    if (networkQ.trim().length < 2) return;
    const r = await fetch(`/api/networks?q=${encodeURIComponent(networkQ)}`);
    setNetworkResults(await r.json());
  }

  async function handleCreateNetwork() {
    if (!newNetName.trim()) return;
    setCreatingNet(true);
    try {
      const res = await fetch("/api/networks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newNetName.trim() }) });
      if (!res.ok) { toast.error((await res.json()).error); return; }
      toast.success("Réseau créé !"); setNewNetName("");
      fetch(`/api/networks?q=`).then(r => r.json()).then(setMyNetworks).catch(() => {});
    } catch { toast.error("Erreur"); } finally { setCreatingNet(false); }
  }

  async function handleJoinNetwork(netId: string) {
    setJoiningNet(netId);
    try {
      const res = await fetch(`/api/networks/${netId}`, { method: "POST" });
      if (!res.ok) { toast.error((await res.json()).error); return; }
      toast.success("Réseau rejoint !"); setNetworkResults([]);
    } catch { toast.error("Erreur"); } finally { setJoiningNet(null); }
  }

  function copyInviteCode() { if (!church?.inviteCode) return; navigator.clipboard.writeText(church.inviteCode); toast.success("Code copié !"); }

  if (loading || userLoading) return <div><Header title="Mon Église" /><p className="text-sm text-muted-foreground">Chargement…</p></div>;

  // ── No church yet ──────────────────────────────────────────────────────────
  if (!u?.churchId && !myRequest) {
    return (
      <div>
        <Header title="Mon Église" subtitle="Créez ou rejoignez une église" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold">Créer une église</p></div>
            <p className="text-xs text-muted-foreground">Vous devenez administrateur et pouvez inviter votre équipe.</p>
            <div className="space-y-3">
              <div><Label className="text-xs">Nom</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Église Éléments Com" className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">Description (optionnel)</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Une courte description" className="mt-1 h-9 text-sm" /></div>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">{creating ? "Création…" : "Créer l'église"}</Button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold">Rejoindre une église</p></div>
            <p className="text-xs text-muted-foreground">Recherchez par nom ou entrez le code d&apos;invitation.</p>
            <div className="flex gap-2"><Input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="Nom ou code…" className="flex-1 h-9 text-sm" /><Button variant="outline" size="sm" onClick={handleSearch}><Search className="h-4 w-4" /></Button></div>
            {searchResults.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c._count?.members ?? 0} membres</p></div>
                <Button size="sm" variant="outline" onClick={() => handleJoin(c.id)} disabled={joining === c.id}>{joining === c.id ? "Envoi…" : "Demander"}</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Pending request ────────────────────────────────────────────────────────
  if (!u?.churchId && myRequest) {
    return (
      <div>
        <Header title="Mon Église" subtitle="Demande en attente" />
        <div className="max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3"><div className="rounded-full bg-amber-500/10 p-2.5"><Building2 className="h-5 w-5 text-amber-500" /></div><div><p className="font-semibold text-sm">Demande envoyée</p><p className="text-xs text-muted-foreground">En attente de l&apos;administrateur</p></div></div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {myRequest.messages.map(m => { const isMine = m.sender.id === user?.id; return (<div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}><div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-xs", isMine ? "bg-primary text-primary-foreground" : "bg-muted")}>{!isMine && <p className="font-medium mb-0.5 text-[10px] opacity-70">{m.sender.name}</p>}{m.content}</div></div>); })}
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            <Input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Répondre…" className="text-xs h-8" />
            <button onClick={() => handleSendMessage(myRequest.id, myRequest.id)} disabled={sendingMsg || !msgText.trim()} className="rounded-md bg-primary px-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    );
  }

  // ── Church member view ─────────────────────────────────────────────────────
  return (
    <div>
      <Header
        title={church?.name ?? "Mon Église"}
        subtitle={church?.description || undefined}
        action={
          church ? (
            <a href={`/churches/${church.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Page publique
            </a>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border mb-6 overflow-x-auto">
        {TABS.filter(t => t.key !== "overview" || isAdmin).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors", tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview (admin only) ─────── */}
      {tab === "overview" && isAdmin && (
        <div className="space-y-6">
          {/* Invite code */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">Code d&apos;invitation :</span>
            <code className="flex-1 text-xs font-mono truncate">{church?.inviteCode}</code>
            <button onClick={copyInviteCode} className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
          </div>

          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Membres", value: stats.totalMembers },
                { label: "Services total", value: stats.totalServices },
                { label: "Services cette année", value: stats.servicesThisYear },
                { label: "Onboarding", value: `${stats.onboardingRate}%` },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold tabular-nums mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Join requests */}
          {joinRequests.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                Demandes d&apos;adhésion
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{joinRequests.length}</span>
              </p>
              <div className="space-y-3">
                {joinRequests.map(req => (
                  <div key={req.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-medium">{req.user.name}</p>{req.user.email && <p className="text-xs text-muted-foreground">{req.user.email}</p>}</div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setOpenReqId(openReqId === req.id ? null : req.id)} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs border border-border hover:bg-accent"><MessageSquare className="h-3.5 w-3.5" />Chat{openReqId === req.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
                        <button onClick={() => handleDecision(req.id, "approve")} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"><Check className="h-3.5 w-3.5" />Accepter</button>
                        <button onClick={() => handleDecision(req.id, "reject")} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs border border-destructive/30 text-destructive hover:bg-destructive/10"><X className="h-3.5 w-3.5" />Refuser</button>
                      </div>
                    </div>
                    {openReqId === req.id && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
                          {req.messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Aucun message</p>}
                          {req.messages.map(m => { const isMine = m.sender.id === user?.id; return (<div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}><div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-xs", isMine ? "bg-primary text-primary-foreground" : "bg-muted")}>{!isMine && <p className="font-medium mb-0.5 text-[10px] opacity-70">{m.sender.name}</p>}{m.content}</div></div>); })}
                        </div>
                        <div className="flex gap-2">
                          <Input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage(req.id, church!.id)} placeholder="Message…" className="text-xs h-8" />
                          <button onClick={() => handleSendMessage(req.id, church!.id)} disabled={sendingMsg || !msgText.trim()} className="rounded-md bg-primary px-3 text-primary-foreground disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Announcements ─────── */}
      {tab === "announcements" && (
        <div className="space-y-4 max-w-2xl">
          {isAdmin && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Nouvelle annonce</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Label className="text-xs">Titre</Label><Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="mt-1 h-9 text-sm" /></div>
                <div><Label className="text-xs">Catégorie</Label>
                  <select value={annCat} onChange={e => setAnnCat(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} rows={3} placeholder="Contenu de l'annonce…" className="w-full rounded-md border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              <Button onClick={handlePostAnn} disabled={postingAnn || !annTitle.trim() || !annContent.trim()} className="w-full">{postingAnn ? "Publication…" : "Publier l'annonce"}</Button>
            </div>
          )}

          {announcements.length === 0 && <p className="text-sm text-muted-foreground">Aucune annonce pour le moment.</p>}
          {announcements.map(a => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground rounded px-1.5 py-0.5">{CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  </div>
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">Par {a.author.name}</p>
                </div>
                {isAdmin && <button onClick={() => handleDeleteAnn(a.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Team ─────── */}
      {tab === "team" && (
        <div className="space-y-3 max-w-2xl">
          {(church?.members ?? []).map(m => (
            <div key={m.id} className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">{m.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="text-sm font-medium truncate">{m.name}</p>{["OWNER", "ADMIN"].includes(m.churchRole) && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}</div>
                {m.instruments && <p className="text-xs text-muted-foreground truncate">{m.instruments}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">{m.churchRole}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Availability ─────── */}
      {tab === "availability" && availData && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Membre</th>
                {availData.services.map(s => (
                  <th key={s.id} className="text-center py-2 px-2 font-medium text-muted-foreground min-w-[80px]">
                    <div>{new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</div>
                    <div className="text-[10px] opacity-70 truncate max-w-[80px]">{s.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {availData.members.map(m => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 pr-4 font-medium">{m.name}</td>
                  {availData.services.map(s => {
                    const av = availData.availabilities.find(a => a.userId === m.id && new Date(a.date).toDateString() === new Date(s.date).toDateString());
                    return (
                      <td key={s.id} className="text-center py-2 px-2">
                        {av === undefined ? <span className="text-muted-foreground">?</span>
                          : av.available ? <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                          : <X className="h-4 w-4 text-red-500 mx-auto" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {availData.services.length === 0 && <p className="text-sm text-muted-foreground mt-4">Aucun service à venir</p>}
        </div>
      )}

      {/* ── Tab: Onboarding ─────── */}
      {tab === "onboarding" && (
        <div className="max-w-xl space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Mon profil d&apos;équipe</p>

            <div>
              <Label className="text-xs mb-2 block">Mes instruments</Label>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUMENTS.map(inst => (
                  <button key={inst} type="button" onClick={() => setMyInstruments(prev => prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst])}
                    className={cn("rounded-md px-2.5 py-1 text-xs font-medium border transition-colors", myInstruments.includes(inst) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-foreground/30")}>
                    {inst}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Bio / présentation</Label>
              <textarea value={myBio} onChange={e => setMyBio(e.target.value)} rows={3} placeholder="Parlez un peu de vous à l'équipe…" className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <Button onClick={handleSaveOnboarding} disabled={savingOnb} className="w-full">
              {savingOnb ? "Sauvegarde…" : "Enregistrer mon profil d'équipe"}
            </Button>
          </div>

          {/* Onboarding checklist */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold mb-3">Checklist d&apos;arrivée</p>
            {[
              { label: "Profil complété (nom, email)", done: !!(user?.email && user?.name) },
              { label: "Instruments renseignés", done: myInstruments.length > 0 },
              { label: "Bio ajoutée", done: myBio.trim().length > 0 },
              { label: "Disponibilités ajoutées", done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0", item.done ? "bg-emerald-500" : "border-2 border-border")}>
                  {item.done && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={cn("text-sm", item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Network ─────── */}
      {tab === "network" && isAdmin && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Créer un réseau d&apos;églises</p>
            <p className="text-xs text-muted-foreground">Un réseau permet à plusieurs églises de partager des ressources et de collaborer.</p>
            <div className="flex gap-2">
              <Input value={newNetName} onChange={e => setNewNetName(e.target.value)} placeholder="Nom du réseau…" className="flex-1 h-9 text-sm" onKeyDown={e => e.key === "Enter" && handleCreateNetwork()} />
              <Button onClick={handleCreateNetwork} disabled={creatingNet || !newNetName.trim()} size="sm">{creatingNet ? "Création…" : "Créer"}</Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Rejoindre un réseau existant</p>
            <div className="flex gap-2">
              <Input value={networkQ} onChange={e => setNetworkQ(e.target.value)} placeholder="Rechercher un réseau…" className="flex-1 h-9 text-sm" onKeyDown={e => e.key === "Enter" && handleSearchNetwork()} />
              <Button variant="outline" size="sm" onClick={handleSearchNetwork}><Search className="h-4 w-4" /></Button>
            </div>
            {networkResults.map(n => (
              <div key={n.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div><p className="text-sm font-medium">{n.name}</p><p className="text-xs text-muted-foreground">{n._count?.churches ?? 0} église{(n._count?.churches ?? 0) !== 1 ? "s" : ""}</p></div>
                <Button size="sm" variant="outline" onClick={() => handleJoinNetwork(n.id)} disabled={joiningNet === n.id}>{joiningNet === n.id ? "…" : "Rejoindre"}</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
