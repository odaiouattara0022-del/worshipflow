# Design — Support multi-logiciels de présentation (driver abstraction)

**Date :** 2026-06-02
**Statut :** Validé (design) — prêt pour le plan d'implémentation
**Projet :** ProSendWorship (worshipflow)

## Objectif

Découpler l'application du logiciel ProPresenter pour pouvoir piloter **plusieurs logiciels de présentation** (FreeShow en premier, puis OpenLP, EasyWorship, etc.). But métier : **élargir l'audience** — servir un maximum d'églises quel que soit leur logiciel de projection.

Niveau d'intégration visé : **parité ProPresenter** (pousser un chant/service **+** contrôle live), en acceptant que les logiciels sans API complète soient supportés **partiellement** (déclaré via un modèle de capacités).

Premier logiciel cible (après ProPresenter) : **FreeShow** (gratuit, open-source, API REST + WebSocket, format `.show` en JSON).

## Constat de départ

Le cœur de l'app est **déjà agnostique** : bibliothèque de chants, planification de services, équipe, disponibilités, CCLI, notifications ne connaissent rien de ProPresenter. Seule la **couche sortie/contrôle** est couplée :
- 11 routes `src/app/api/propresenter/*`
- `src/lib/propresenter/*` (bridge, pro-file-generator, sync, client…)
- L'agent local `pp-agent/`
- Les modèles `PPDevice` / `PPCommand`
- Un hook de sync dans `src/app/api/songs/route.ts` (`autoSyncSong`)

→ Pas besoin de réécrire le cœur. On **abstrait la couche d'intégration**.

## Architecture retenue (Approche 1 : driver + agent universel)

```
        CŒUR (déjà agnostique)
   Chants · Services · Équipe · CCLI
              │
              ▼
   ┌─────────────────────────┐
   │   Registre de drivers    │   ← serveur (Vercel)
   │  capabilities + routing  │
   └─────────────────────────┘
              │  commande générique { action, payload }  (deviceId porte le type)
              ▼
   Bridge long-poll (transport, déjà générique — inchangé)
              │
              ▼
   ┌─────────────────────────┐
   │  WorshipFlow Agent (PC)  │   ← un seul agent
   │  drivers/propresenter.js │
   │  drivers/freeshow.js     │
   └─────────────────────────┘
        │              │
        ▼              ▼
   ProPresenter     FreeShow      (APIs locales)
   :1025            :5505
```

**Deux niveaux :**
1. **Serveur** — un *driver descriptor* par logiciel : déclare ses **capacités** et traduit une action de l'app en commande générique poussée dans le bridge existant.
2. **Agent (PC)** — modules spécifiques au protocole. L'agent reçoit `{ action, payload }`, lit le `type` de l'appareil dans sa config, et appelle `drivers/<type>.js`.

Le **transport ne change pas** : on réutilise le bridge long-poll (commande livrée en ~100 ms, hold 6 s) qui route déjà n'importe quelle commande.

## Interface `PresentationDriver` (serveur)

```ts
type OutputType = "propresenter" | "freeshow"; // extensible

interface PresentationDriver {
  readonly type: OutputType;
  readonly capabilities: Capabilities;

  sendSong(song, arrangement?): Promise<void>;
  sendService(service): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  clear(target?): Promise<void>;
  getStatus(): Promise<OutputStatus>;
  syncLibrary(): Promise<LibraryItem[]>;
}

interface Capabilities {
  sendSong: boolean;
  sendService: boolean;
  liveControl: boolean;   // next / previous / clear
  status: boolean;        // slide actuelle + suivante
  syncLibrary: boolean;
  themes: boolean;
}
```

**Rôle des capacités :** chaque logiciel déclare ce qu'il sait faire ; l'UI lit ce descripteur et **grise/masque** les actions non supportées. On supporte ainsi *partiellement* des logiciels faibles en API sans casser l'UX.

### Capacités par logiciel

| Capacité | ProPresenter | FreeShow | (futur) EasyWorship |
|---|---|---|---|
| Pousser chant/service | ✅ | ✅ | ✅ (export) |
| Contrôle live | ✅ | ✅ | ❌ |
| Statut slide | ✅ | ✅ | ❌ |
| Sync bibliothèque | ✅ | ✅ | ❌ |
| Thèmes | ✅ | ⚠️ partiel | ❌ |

## Modèle de données

Changements **minimaux et rétro-compatibles** — on garde les noms de tables `PPDevice` / `PPCommand` (pas de `prisma migrate` : adaptateur Supabase REST, un renommage serait risqué pour un gain cosmétique).

```
PPDevice : AJOUT de colonnes
  type    text  DEFAULT 'propresenter'   -- "propresenter" | "freeshow"
  config  text  NULL                     -- JSON: réglages spécifiques au logiciel
```

- SQL direct sur Supabase : `ALTER TABLE "PPDevice" ADD COLUMN type text DEFAULT 'propresenter'; ALTER TABLE "PPDevice" ADD COLUMN config text;`
- Maj `prisma/schema.prisma` (documentation/types).
- `src/lib/db.ts` : **aucun changement** (l'adaptateur passe les colonnes telles quelles).
- `PPCommand` : inchangé (référence `deviceId` ; le `type` est porté par l'appareil).

## Généralisation de l'agent

```
pp-agent/
  agent.js          ← boucle long-poll inchangée ; lit config.type pour router
  drivers/
    propresenter.js ← handlers.js actuel déplacé tel quel
    freeshow.js     ← NOUVEAU
```

- L'agent reçoit `{ action, payload }`, lit `config.type`, appelle `drivers/<type>.js`.
- Le `.exe` ProPresenter déjà installé **continue de fonctionner** (type par défaut).
- `pp-agent-config.json` gagne un champ `type` et les détails de connexion locale du logiciel (host/port existent déjà).

## Intégration FreeShow (2ᵉ driver)

- **Contrôle live** : `drivers/freeshow.js` se connecte à l'API FreeShow (WebSocket/REST, port ~5505) et envoie `next_slide` / `previous_slide` / `clear_all` / aller à une slide.
- **Pousser un chant** : génération du format **`.show` FreeShow (JSON)** depuis le modèle `Song` (paroles → slides) — équivalent JSON de `pro-file-generator.ts`, bien plus simple que le protobuf PP.
- **Statut** : lecture de la slide active via l'API FreeShow.
- Les endpoints et le schéma `.show` exacts seront **confirmés pendant l'implémentation** contre la doc officielle FreeShow (le design fige les points d'intégration, pas chaque champ).

## UI

- **Paramètres** : « Appareils ProPresenter » → « **Appareils de sortie** », avec un sélecteur de type à l'ajout (ProPresenter / FreeShow).
- **Pages contrôle/envoi** : lisent `capabilities` de l'appareil sélectionné → masquent/grisent les actions non supportées.

## Compatibilité & non-régression

- Appareils existants → `propresenter` par défaut (zéro action requise).
- Agent `.exe` existant → intact.
- Routes `api/propresenter` → passent par le registre de drivers **sans changement de comportement** (test de non-régression PP obligatoire).

## Tests

- **Unitaires** (parties pures) : génération du `.show` FreeShow (chant → slides JSON), filtrage par capacités, sélection du driver dans le registre.
- **Intégration manuelle** : `FreeShowDriver` contre une vraie instance FreeShow (checklist de test live sur le PC).
- **Non-régression ProPresenter** : envoyer un chant + contrôle live identiques à aujourd'hui.

## Périmètre

**Inclus (1er chantier)**
- Abstraction driver + modèle de capacités (serveur)
- Refactor ProPresenter en `ProPresenterDriver` (comportement identique)
- Colonnes `type` + `config`
- Agent : `handlers.js` → `drivers/propresenter.js` + nouveau `drivers/freeshow.js`
- `FreeShowDriver` : pousser un chant + contrôle live (suivant/préc./effacer) + statut
- UI : sélecteur de type d'appareil + contrôles pilotés par les capacités

**Reporté (plus tard)**
- Thèmes FreeShow, sync bibliothèque FreeShow
- Drivers OpenLP / EasyWorship
- Renommage des tables en `OutputDevice`
- Envoi simultané vers plusieurs logiciels à la fois

## Risques & points d'attention

- **API FreeShow** : la doc/format `.show` doit être confirmée tôt en implémentation (spike) avant de bâtir le générateur.
- **Non-régression PP** : le refactor en driver ne doit rien changer au comportement existant — tester avant/après.
- **Génération `.show`** : mapper correctement paroles → slides (sauts de ligne/paragraphes) comme le fait déjà la logique PP.
