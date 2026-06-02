# Audit Produit : ProSendWorship / WorshipFlow
**Répertoire :** `D:\ELEMENTS COM\CLAUDE\worshipflow`
**Date :** 2 juin 2026
**Type d'application :** SaaS interne — Gestion d'équipe de louange
**Stack :** Next.js 16 · React 19 · Prisma 7 · TypeScript · shadcn/ui · Tailwind CSS 4
**Score global estimé : 68/100 (C — Bon potentiel, lacunes significatives)**

---

## Résumé Exécutif

WorshipFlow est une application web complète et bien architecturée pour la gestion d'équipes de louange. Elle couvre un périmètre fonctionnel impressionnant : planification de services, bibliothèque de chants avec grilles d'accords, intégration ProPresenter, gestion d'équipe, disponibilités, notifications et rapport CCLI. La stack technique est moderne et le code est globalement propre.

Cependant, plusieurs problèmes critiques doivent être adressés avant un déploiement élargi :

1. **Incohérence de marque** entre "ProSendWorship" (login/register) et "WorshipFlow" (UI principale)
2. **Sécurité auth** : secret HMAC hardcodé en fallback, pas de validation d'expiration de session
3. **Pas d'isolation des chants par église** : le modèle `Song` n'a pas de `churchId`
4. **Pages login/register** avec inline styles en rupture totale avec le design system

L'implémentation des recommandations prioritaires permettrait d'atteindre un score de **85+/100**.

---

## Tableau des Scores

| Catégorie | Score | Poids | Score pondéré | Constat clé |
|-----------|-------|-------|--------------|-------------|
| Fonctionnalités & UX | 72/100 | 30% | 21.6 | Couverture large, quelques flux incomplets |
| Qualité du code | 70/100 | 25% | 17.5 | Bonne structure, quelques `any` et duplication |
| Sécurité | 55/100 | 25% | 13.8 | Fondamentaux corrects, 3 points critiques |
| Landing Page & Branding | 60/100 | 10% | 6.0 | Fonctionnelle mais trop minimale |
| Architecture & Scalabilité | 75/100 | 10% | 7.5 | Multi-église partiel, songs non isolées |
| **TOTAL** | | **100%** | **66.4/100** | |

---

## 🔴 Priorité 1 — Problèmes Critiques (à corriger immédiatement)

### 1. Secret d'authentification hardcodé

**Fichier :** `src/lib/auth.ts:6`

```ts
const AUTH_SECRET = process.env.AUTH_SECRET ?? "worshipflow-secret-change-me";
```

**Problème :** Si `AUTH_SECRET` n'est pas défini en production, toutes les sessions sont signées avec un secret connu publiquement. N'importe qui peut forger un token de session valide.

**Correction :** Faire planter l'app au démarrage si le secret n'est pas défini.
```ts
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) throw new Error("AUTH_SECRET environment variable is required");
```

---

### 2. Pas d'expiration de session

**Fichier :** `src/lib/auth.ts:76-93`

Le token encode `Date.now()` dans le payload mais `verifyToken()` ne valide jamais ce timestamp. Une session créée il y a 2 ans est toujours valide tant que le cookie existe.

**Correction :** Extraire le timestamp du payload et vérifier qu'il a moins de 30 jours dans `verifyToken()`.

---

### 3. Songs non isolées par église

**Fichier :** `prisma/schema.prisma:109-134`

Le modèle `Song` n'a pas de `churchId`. Toutes les églises partagent la même bibliothèque de chants. Si plusieurs équipes utilisent l'app, elles voient et modifient les chants de tout le monde.

**Correction :** Ajouter `churchId String?` au modèle `Song` et filtrer les requêtes par église.

---

## 🟠 Priorité 2 — Problèmes Importants (cette semaine)

### 4. Incohérence de marque : "ProSendWorship" vs "WorshipFlow"

**Fichiers :** `src/app/login/page.tsx:14`, `src/app/register/page.tsx:22`, `package.json:2`

La page de login affiche `✦ ProSendWorship`, la sidebar affiche `WorshipFlow`, la landing page affiche `WorshipFlow`. L'utilisateur ne sait pas quelle est l'app qu'il utilise.

**Décision à prendre :** Choisir un nom unique et l'appliquer partout.

---

### 5. Pages login/register avec inline styles

**Fichiers :** `src/app/login/page.tsx`, `src/app/register/page.tsx`

Ces deux pages utilisent exclusivement des `style={{ ... }}` inline alors que toute l'app utilise Tailwind + shadcn/ui. Résultat :
- Design incohérent (dark background forcé même si le thème est clair)
- Impossible de changer le thème sur ces pages
- Duplication de code de style

**Correction :** Réécrire ces pages avec les composants shadcn/ui (`Card`, `Input`, `Button`, `Label`) comme le reste de l'app.

---

### 6. Authentification par "nom" plutôt qu'identifiant unique

**Fichier :** `src/app/login/page.tsx:24-32`

Le login utilise le champ `name` (prénom/nom en clair) comme identifiant. Si deux membres s'appellent "Jean Martin", l'un ne peut pas créer de compte. Et si quelqu'un change de nom, son accès est cassé.

**Correction :** Utiliser un `username` unique ou l'email comme identifiant de connexion.

---

### 7. Pas de protection CSRF sur les formulaires

**Fichiers :** `src/app/api/auth/login-form/route.ts`, `src/app/api/auth/register/route.ts`

Les formulaires POST n'utilisent pas de token CSRF. Un site tiers pourrait soumettre ces formulaires à la place de l'utilisateur.

**Correction :** Ajouter un token CSRF (hidden input) ou utiliser `sameSite: "strict"` sur le cookie (actuellement `"lax"`).

---

### 8. Polling agressif sur la page Live Control

**Fichier :** `src/app/(app)/live/page.tsx:102-107`

```ts
intervalRef.current = setInterval(pollStatus, 800);
```

800ms de polling = 75 requêtes/minute par utilisateur. Sur un iPhone pendant le culte avec une connexion 4G limitée, cela peut causer des freezes et une consommation batterie excessive.

**Correction :** Passer à 2000-3000ms, ou mieux, utiliser WebSocket/SSE pour les mises à jour en temps réel.

---

## 🟡 Priorité 3 — Améliorations (ce mois)

### 9. Types `any` à corriger

**Fichiers multiples :**

```ts
// dashboard/page.tsx:78
{upcomingServices.map((s: any) => (

// songs/page.tsx:65
{songs.map((song: any) => (

// settings/page.tsx:67
const u = user as any;
```

Ces `any` masquent des erreurs potentielles. Définir des types explicites améliore la fiabilité et les auto-complétions.

---

### 10. Pas de page "Mot de passe oublié"

Il n'y a aucun mécanisme de récupération de compte. Si un membre oublie son mot de passe, seul un admin peut le réinitialiser manuellement en base.

**Correction :** Ajouter un flow de reset par email (Resend est déjà intégré).

---

### 11. Pas de PWA / icône d'app

L'app est présentée comme utilisable "depuis votre téléphone pendant le culte" mais n'a pas de `manifest.json`, pas d'icône d'app, pas de service worker. Elle ne peut pas être installée comme une vraie app mobile.

**Correction :** Ajouter un `manifest.json` et les icônes nécessaires dans `/public/`.

---

### 12. Tab "Email / SMTP" désactivée silencieusement

**Fichier :** `src/app/(app)/settings/page.tsx:37`

```ts
// { key: "email", label: "Email / SMTP", icon: Bell }, // désactivé temporairement
```

Cette tab est commentée mais le code est toujours là (lignes 291-395). Si un utilisateur accède directement à `?tab=email` via l'URL, il voit le contenu. Soit la réactiver, soit supprimer le code.

---

### 13. `confirm()` natif du browser pour les suppressions

**Fichier :** `src/app/(app)/settings/page.tsx:124`

```ts
if (!confirm(`Supprimer ${name} ?`)) return;
```

`confirm()` est bloquant, ne respecte pas le thème de l'app, et est bloqué par certains navigateurs mobiles. Utiliser un `Dialog` de confirmation shadcn/ui.

---

### 14. Landing page trop minimale

**Fichier :** `src/app/page.tsx`

La landing manque de :
- **Screenshots** de l'interface (les utilisateurs veulent voir avant de s'inscrire)
- **Preuve sociale** ("Utilisé par X équipes")
- **Page de tarification** (même si gratuit, le dire explicitement rassure)
- **FAQ** (questions courantes sur la connexion ProPresenter, l'installation de l'agent)
- **Meta tags OG** pour le partage sur WhatsApp/réseaux sociaux

---

### 15. Pas de validation côté client sur les formulaires de création

**Fichiers :** `src/app/(app)/services/page.tsx:59-82`, `src/components/songs/song-form.tsx`

La validation est uniquement faite au submit sans feedback immédiat. Utiliser une lib comme `zod` + validation en temps réel améliorerait l'UX.

---

## Architecture & Scalabilité

### Points forts
- **App Router Next.js** correctement utilisé : Server Components pour les pages qui le permettent, Client Components pour l'interactivité
- **Prisma 7** avec PostgreSQL — bon choix pour la production
- **Séparation claire** : `src/lib/`, `src/components/`, `src/app/api/`
- **Multi-église** : modèle `Church` avec `inviteCode`, `JoinRequest`, rôles par église

### Points à améliorer
- **pp-agent bridge** (`src/app/api/pp-bridge/`) utilise un système de polling HTTP longue durée. Fonctionnel mais fragile — un WebSocket direct serait plus robuste.
- **Pas de pagination** sur les listes de chants et services — problème à l'échelle (500+ chants).
- **`ServiceTemplate.items` stocké en JSON string** au lieu d'une vraie relation — limite les requêtes et la validation.

---

## Sécurité — Bilan complet

| Point | Statut | Détail |
|-------|--------|--------|
| Mots de passe bcrypt (salt 10) | ✅ OK | `src/lib/auth.ts:46` |
| Cookie httpOnly | ✅ OK | |
| Cookie secure en production | ✅ OK | |
| HMAC sha256 sur les sessions | ✅ OK | |
| Comparaison timing-safe | ✅ OK | `crypto.timingSafeEqual` |
| Secret AUTH_SECRET hardcodé | ❌ Critique | Voir #1 |
| Expiration de session | ❌ Critique | Voir #2 |
| Protection CSRF | ⚠️ Manquant | Voir #7 |
| Rate limiting sur /login | ⚠️ À vérifier | `src/lib/rate-limit.ts` existe — vérifier qu'il est appliqué aux routes auth |
| Validation des inputs API | ⚠️ Partiel | Certaines routes ne valident pas les types entrants |

---

## Quick Wins (< 1 heure chacun)

1. **Changer le fallback AUTH_SECRET** pour lever une exception → 5 min, impact sécurité critique
2. **Unifier le nom de marque** sur login/register → 10 min, impact UX immédiat
3. **Passer le polling live de 800ms à 2500ms** → 2 min, économise 70% des requêtes
4. **Remplacer `confirm()` par un Dialog** → 20 min, UX mobile meilleure
5. **Ajouter les meta tags OG** sur la landing page → 15 min, partage WhatsApp correct
6. **Supprimer ou réactiver le tab email** → 5 min, cohérence settings

---

## Recommandations Stratégiques (ce mois)

1. **Réécrire les pages login/register** avec le design system shadcn/ui
   - Impact : Cohérence visuelle totale, support du thème clair/sombre
   - Effort : 2-3 heures

2. **Ajouter `churchId` sur `Song` + migration**
   - Impact : Vraie isolation multi-église
   - Effort : 1 journée (migration + mise à jour de toutes les requêtes)

3. **Implémenter l'expiration de session**
   - Impact : Sécurité session correcte
   - Effort : 30 min dans `auth.ts`

4. **Ajouter pagination** sur `/songs` et `/services`
   - Impact : Performances à l'échelle
   - Effort : 2-3 heures

5. **Créer un flow d'onboarding** pour les nouveaux comptes
   - Impact : Taux d'activation (beaucoup de nouvelles équipes abandonnent faute de guidage)
   - Effort : 1-2 jours

---

## Initiatives Long Terme (ce trimestre)

1. **Transformer en PWA installable** — manifest, service worker, offline pour la bibliothèque de chants
2. **Remplacer le polling HTTP du pp-bridge par WebSocket** — fiabilité en live
3. **Ajouter un mode "Répétition" interactif** — la page existe (`/rehearsal`) mais son contenu est à implémenter
4. **Support multi-langue** — l'app est en français, ajouter l'anglais ouvrirait le marché anglophone

---

## Ce Qui Fonctionne Très Bien ✅

- **Intégration ProPresenter** : architecture pp-agent + bridge HTTP est originale et efficace
- **Grilles d'accords + transposition** : `src/lib/chords.ts` — fonctionnalité rare et précieuse
- **Rapport CCLI automatique** : peu d'apps worship le font automatiquement
- **Gestion des disponibilités** : modèle `Availability` bien pensé
- **Live Control** : UI claire avec grille de slides, contrôles transport, playlists
- **Dark/light theme** : `next-themes` correctement intégré
- **Drag & drop** sur l'ordre des items de service (`@dnd-kit`)

---

## Prochaines Actions Recommandées

1. Corriger le secret AUTH_SECRET (5 min — sécurité critique)
2. Unifier le nom de marque sur login/register
3. Réécrire login/register avec shadcn/ui
4. Ajouter l'expiration de session dans `auth.ts`
5. Planifier la migration `Song.churchId`

---

*Audit généré par Claude Code — 2 juin 2026*
