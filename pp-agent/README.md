# PP Agent — ProSendWorship Bridge

Connecte ProPresenter à ProSendWorship en quelques minutes, sans configuration réseau.

## Installation (~2 minutes)

### Prérequis

- Windows 10 / 11
- ProPresenter installé (l'API HTTP doit être activée)

### Étapes

1. **Copiez ce dossier** sur l'ordinateur ProPresenter (ex: `C:\pp-agent\`)

2. **Double-cliquez sur `install.bat`**

   Le script fait tout automatiquement :
   - Installe Node.js si absent
   - Installe les dépendances
   - Vous pose 2 questions (URL + ID de l'appareil)
   - Configure le démarrage automatique Windows
   - Démarre l'agent immédiatement

3. **Répondez aux 2 questions** :
   - URL ProSendWorship : `https://prosendworship.vercel.app`
   - ID de l'appareil : visible dans ProSendWorship → Paramètres → Appareils ProPresenter

C'est tout ! L'agent tournera en arrière-plan et démarrera automatiquement à chaque connexion Windows.

---

## Activer l'API HTTP dans ProPresenter

ProPresenter → Préférences → Réseau → cocher "Activer l'API HTTP" → Port : 1025

---

## Dépannage

**Statut rouge dans ProSendWorship** → Vérifiez que l'agent tourne (Planificateur de tâches → "ProSendWorship PP Agent")

**"ID d'appareil invalide"** → Copiez exactement l'ID depuis ProSendWorship → Paramètres → Appareils

**"ProPresenter non accessible"** → Activez l'API HTTP dans ProPresenter (voir ci-dessus)

**Réinitialiser** → Relancez `install.bat` et choisissez "Reconfigurer"
