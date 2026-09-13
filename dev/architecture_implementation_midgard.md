# Spécification Technique & Architecture d'Implémentation (KubeJS / NeoForge 1.21.1)

> **Projet** : Midgard / Third World Server  
> **Environnement** : NeoForge 1.21.1 | KubeJS 21.1.x | FTB Chunks & Teams | Lightman's Currency | Create Big Cannons | Ballistix | Point Blank  
> **Fichiers pivots existants** : [`ftb_helpers.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/ftb_helpers.js), [`war_system.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_system.js), [`war_claims_hook.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_claims_hook.js), [`nation_bank.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/nation_bank.js), [`onu_contracts.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/onu_contracts.js).

---

## 1. Cartographie Globale des Composants

L'implémentation s'appuie sur le système de persistance native `readJsonData` / `writeJsonData` dans `kubejs/data/` et sur les écouteurs d'événements KubeJS côté serveur.

```
kubejs/
├── data/
│   ├── wars.json               # Registre des Conflits & Guerres (étendu)
│   ├── altars.json             # Coordonnées des Autels / Drapeaux par nation [NOUVEAU]
│   ├── sanctuaries.json        # Chunks protégés des explosions par l'admin [NOUVEAU]
│   ├── onu_contracts.json      # Contrat mondial quotidien actif
│   └── onu_weekly.json         # Jauges hebdomadaires & streaks des nations [NOUVEAU]
│
└── server_scripts/
    ├── ftb_helpers.js          # API commune FTB Teams / Chunks, persistance JSON
    ├── war_system.js           # Moteur d'état des guerres & NOUVELLE logique de Conflits
    ├── war_flag.js             # Moteur CTF : Autel, vol, transport, drop, sécurisation [NOUVEAU]
    ├── war_claims_hook.js      # Interception des interactions, casse manuelle & anti-grief
    ├── war_sanctuary.js        # Gestion admin des chunks sanctuaires anti-explosions [NOUVEAU]
    ├── onu_contracts.js        # Gestionnaire de contrats quotidiens & hebdomadaires
    └── nation_bank.js          # Débit/Crédit des trésors d'État via Lightman's Currency
```

---

## 2. Module 1 : Moteur de Conflits vs Guerres (`war_system.js`)

### A. Extension du Schéma de Données (`kubejs/data/wars.json`)

Le schéma actuel est étendu avec le champ discriminant `type: 'WAR' | 'CONFLICT'` et le suivi du pot commun :

```json
{
  "12": {
    "id": "12",
    "type": "CONFLICT",
    "status": "ACTIVE",
    "attackerTeamId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "attackerName": "Norvège",
    "defenderTeamId": "7d92fb12-3214-4112-98ab-1a2b3c4d5e6f",
    "defenderName": "Suède",
    "escrowPool": 500,
    "createdAt": 1773412800000,
    "startedAt": 1773413100000,
    "expiresAt": 1773416700000,
    "flagCarrierUuid": null,
    "carrierTeamId": null
  },
  "13": {
    "id": "13",
    "type": "WAR",
    "status": "ACTIVE",
    "attackerTeamId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "attackerName": "Norvège",
    "defenderTeamId": "7d92fb12-3214-4112-98ab-1a2b3c4d5e6f",
    "defenderName": "Suède",
    "warCostPaid": 2500,
    "startedAt": 1773424800000,
    "expiresAt": 1773439200000
  }
}
```

### B. Arbre Décisionnel d'Engagement

```
               Commande Joueur (/war conflict <nation> OU /war declare <nation>)
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
     Type: CONFLICT                                           Type: WAR
   - Vérifier 1 joueur en ligne/camp                    - Préavis 24h & approbation admin
   - Solde Banque Attaquant >= 250 R                    - Solde Banque Attaquant >= 2500 R
   - Solde Banque Défenseur >= 250 R                    - Débit 2500 R attaquant SEUL
   - Débit 250 R de CHAQUE banque                       - Fenêtre 18h00 - 22h00
   - escrowPool = 500 R                                 - Gain serveur = 0 R (Pillage libre)
   - Préavis: 5 minutes                                 - Durée: jusqu'à 22h00
   - Durée: Timer strict 60 min                         - Explosions ON (sauf Sanctuaires)
   - Explosions = 0% / Casse manuelle = ON
```

### C. Vérification de Connexion en Temps Réel

```javascript
// Détection via l'API Java MinecraftServer injectée dans KubeJS
function isAtLeastOneMemberOnline(server, teamId) {
    var teamIdStr = teamId.toString()
    var players = server.getPlayerList().getPlayers()
    for (var i = 0; i < players.size(); i++) {
        var p = players.get(i)
        var pTeam = getPlayerTeam(p)
        if (pTeam && pTeam.getId().toString() === teamIdStr) {
            return true
        }
    }
    return false
}
```

---

## 3. Module 2 : Capture the Flag (CTF) & Autel (`war_flag.js`)

Ce module implémente la mécanique de capture sans mod tiers, via des événements de blocs et d'entités natifs.

### A. Modèle de Données de l'Autel (`kubejs/data/altars.json`)

```json
{
  "3fa85f64-5717-4562-b3fc-2c963f66afa6": {
    "teamId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "teamName": "Norvège",
    "x": 142,
    "y": 68,
    "z": -820,
    "dimension": "minecraft:overworld",
    "status": "AT_BASE"
  }
}
```

### B. Événements KubeJS Utilisés

| Événement | Hook KubeJS | Rôle technique |
| :--- | :--- | :--- |
| **Déclaration de l'Autel** | `ServerEvents.command('nation')` (`/nation setaltar`) | Enregistre les coordonnées du bloc ciblé dans `altars.json`. |
| **Interaction / Vol du Flag** | `BlockEvents.rightClicked` | Vérifie si le bloc cliqué est l'autel ennemi. Si conflit actif : donne l'item `flag`, passe le statut à `STOLEN`, applique l'effet *Glowing*. |
| **Protection de l'Autel** | `BlockEvents.broken` | Empêche les propriétaires de détruire leur propre autel en temps de conflit/guerre. |
| **Sécurités de Transport** | `PlayerEvents.inventoryChanged` | Détecte si le joueur tente de ranger le drapeau dans un sac `sophisticatedbackpacks` ou un `ender_chest` -> Annule et réinjecte dans l'inventaire principal. |
| **Anti-Téléportation** | `PlayerEvents.chat` + `ItemEvents.entityInteracted` | Intercepte `/home` et le clic-droit sur les perles de l'Ender tant que l'item drapeau est présent. |
| **Mort du Porteur** | `EntityEvents.death` | L'entité `Item` du drapeau est dropée au sol avec le tag `{NoDespawn:1b,Invulnerable:1b}`. Statut = `DROPPED`. |
| **Récupération au Sol** | `EntityEvents.playerInteract` ou `ItemEvents.entityInteracted` | Si le joueur qui touche l'item est défenseur : suppression de l'item, notification chat, le drapeau retourne à l'autel (`AT_BASE`). Si attaquant : nouveau porteur. |
| **Combat-Log (Déconnexion)**| `PlayerEvents.loggedOut` | Si le joueur a le flag sur lui : déclenche `kill()`, fait drop le drapeau au sol et envoie une alerte avec ses coordonnées. |
| **Validation de Capture** | `BlockEvents.rightClicked` (sur l'autel attaquant) | Vérifie que l'item est dans la main, crédite les 500 R (`depositNationMoneyDirect`), clôture le conflit. |

### C. Définition de l'Item Drapeau
L'item utilisé est une bannière customisée générée via commande NBT :
```javascript
var flagItem = Item.of('minecraft:black_banner', {
    display: {
        Name: '{"text":"Étendard National","color":"gold","bold":true}',
        Lore: ['{"text":"Drapeau d\'État officiel - À ramener à votre autel","color":"yellow"}']
    },
    NationFlag: true,
    TeamOrigin: teamId.toString()
})
```

---

## 4. Module 3 : Casse Manuelle, Pillage & Sanctuaires Admin (`war_claims_hook.js` & `war_sanctuary.js`)

Ce module arbitre précisément qui a le droit de casser, d'exploser ou d'ouvrir les coffres selon le type d'affrontement.

### A. Modèle des Sanctuaires (`kubejs/data/sanctuaries.json`)

```json
{
  "sanctuary_chunks": [
    { "dimension": "minecraft:overworld", "x": 8, "z": -52, "teamId": "3fa85f64...", "label": "Mairie" },
    { "dimension": "minecraft:overworld", "x": 8, "z": -51, "teamId": "3fa85f64...", "label": "Cathédrale" },
    { "dimension": "minecraft:overworld", "x": 9, "z": -52, "teamId": "3fa85f64...", "label": "Musée" }
  ]
}
```
*Commande Admin* : `/waradmin sanctuary add <xChunk> <zChunk>` ou `/waradmin sanctuary chunk` (ajoute le chunk actuel). Nombre illimité.

### B. Matrice des Droits d'Interaction

```
┌───────────────────────────────┬─────────────────────┬───────────────────────────────┐
│ Action                        │ En CONFLIT          │ En GUERRE                     │
├───────────────────────────────┼─────────────────────┼───────────────────────────────┤
│ Casse manuelle (pioche/outil) │ ✔ AUTORISÉE         │ ✔ AUTORISÉE                   │
│ Ouverture de coffres          │ ❌ BLOQUÉE (FTB)     │ ✔ AUTORISÉE (Pillage total)   │
│ Explosions hors sanctuaires   │ ❌ DÉSACTIVÉES (0%) │ ✔ ACTIVES (CBC, Ballistix...) │
│ Explosions DANS sanctuaires   │ ❌ DÉSACTIVÉES (0%) │ ❌ DÉSACTIVÉES (100% immune)  │
└───────────────────────────────┴─────────────────────┴───────────────────────────────┘
```

### C. Implémentation du Blocage des Explosions en Sanctuaire

FTB Chunks intercepte les explosions via son event forge. Dans `war_claims_hook.js`, KubeJS intercepte l'événement d'explosion de bas niveau :

```javascript
// Interception native NeoForge des explosions
LevelEvents.explosionStart(event => {
    var level = event.getLevel()
    var expPos = event.getPosition()
    var chunkX = Math.floor(expPos.x()) >> 4
    var chunkZ = Math.floor(expPos.z()) >> 4
    var dimKey = getLevelDimKey(level)

    // 1. Vérification si le chunk est un Sanctuaire Admin
    if (isSanctuaryChunk(dimKey, chunkX, chunkZ)) {
        event.cancel() // L'explosion est annulée ou ne fait aucun dégât de bloc
        return
    }

    // 2. Si un Conflit est en cours dans cette zone (mais pas de guerre)
    if (isChunkUnderConflictOnly(dimKey, chunkX, chunkZ)) {
        event.cancel() // Zéro dégât de bloc en conflit
        return
    }
})
```

---

## 5. Module 4 : Moteur Économique ONU (`onu_contracts.js`)

Le système économique gère en parallèle les contrats quotidiens compétitifs et les contrats hebdomadaires collectifs.

### A. Modèle des Contrats Hebdomadaires (`kubejs/data/onu_weekly.json`)

```json
{
  "currentWeekId": "2026-W37",
  "expiresAt": 1773619199000,
  "contract": {
    "title": "Grand Réseau Énergétique Continental",
    "goals": [
      { "id": "minecraft:copper_block", "target": 256, "name": "Blocs de Cuivre" },
      { "id": "mekanism:basic_control_circuit", "target": 64, "name": "Circuits de Contrôle" }
    ],
    "baseReward": 8000
  },
  "progress": {
    "3fa85f64-5717-4562-b3fc-2c963f66afa6": {
      "itemsDelivered": {
        "minecraft:copper_block": 180,
        "mekanism:basic_control_circuit": 40
      },
      "completed": false,
      "streak": 2
    }
  }
}
```

### B. Algorithme de Dépôt et Calcul du Bonus de Série (Streak)

```javascript
function depositWeeklyContract(player, team) {
    var weeklyData = loadWeeklyData()
    var teamId = team.getId().toString()
    var entry = weeklyData.progress[teamId] || { itemsDelivered: {}, completed: false, streak: 0 }

    if (entry.completed) {
        sendMsg(player, 'ONU', 'Votre nation a déjà finalisé le contrat hebdomadaire !', '§a')
        return
    }

    var madeDeposit = false
    var goals = weeklyData.contract.goals

    for (var i = 0; i < goals.length; i++) {
        var g = goals[i]
        var current = entry.itemsDelivered[g.id] || 0
        var remaining = g.target - current

        if (remaining > 0) {
            var playerAmount = countPlayerItem(player, g.id)
            if (playerAmount > 0) {
                var depositCount = Math.min(playerAmount, remaining)
                removePlayerItem(player, g.id, depositCount)
                entry.itemsDelivered[g.id] = current + depositCount
                madeDeposit = true
            }
        }
    }

    // Vérification de la complétion de 100% de la jauge
    var isAllDone = true
    for (var j = 0; j < goals.length; j++) {
        if ((entry.itemsDelivered[goals[j].id] || 0) < goals[j].target) {
            isAllDone = false
            break
        }
    }

    if (isAllDone) {
        entry.completed = true
        entry.streak++
        
        // Multiplicateur : +5% par semaine consécutive, plafonné à +25%
        var multiplier = 1.0 + Math.min(0.25, (entry.streak - 1) * 0.05)
        var finalReward = Math.floor(weeklyData.contract.baseReward * multiplier)

        depositNationMoneyDirect(team, finalReward)
        broadcastMsg(server, 'ONU', '§6' + team.getName().getString() + ' §aa accompli le Grand Contrat Hebdomadaire ! Prime versée : §e' + finalReward + ' R §7(Série : ' + entry.streak + ' sem.)', '§2')
    }

    weeklyData.progress[teamId] = entry
    saveWeeklyData(weeklyData)
}
```

---

## 6. Architecture des Commandes Joueurs & Admins

### Commandes Joueurs
* `/war conflict <nation>` : Initie un conflit d'escarmouche (débite 250 R à chaque camp, vérifie qu'au moins 1 joueur est connecté dans chaque équipe, démarre le timer de 60 min).
* `/war declare <nation>` : Lance une déclaration de guerre formelle (débite 2500 R à l'attaquant, soumise à validation).
* `/nation setaltar` : (Leader uniquement) Enregistre le bloc pointé comme Autel National officiel.
* `/nation altar` : Affiche les coordonnées et l'état actuel de son drapeau.
* `/onu weekly` : Affiche l'avancement de la jauge hebdomadaire de son équipe et le temps restant avant le reset du dimanche soir.

### Commandes Admins (`war_admin.js`)
* `/waradmin sanctuary add` : Sanctuarise le chunk actuel (nombre illimité).
* `/waradmin sanctuary remove` : Retire la protection sanctuaire du chunk actuel.
* `/waradmin sanctuary list <nation>` : Liste tous les chunks sanctuarisés d'une nation.
* `/waradmin stop <id>` : Force l'arrêt immédiat d'un conflit ou d'une guerre.

---

## 7. Plan d'Implémentation Étape par Étape

```
[Phase 1 : Économie Hebdomadaire]
 └── Fichier : kubejs/server_scripts/onu_contracts.js + data/onu_weekly.json
 └── Tâches : Structure JSON, cron reset dimanche soir, dépôt fractionné au guichet, streak.

[Phase 2 : Sanctuaires Anti-Explosions]
 └── Fichier : kubejs/server_scripts/war_sanctuary.js + war_claims_hook.js
 └── Tâches : Commandes admin de chunk, écouteur LevelEvents.explosionStart, exemption sélective.

[Phase 3 : Moteur de Conflit & Coûts]
 └── Fichier : kubejs/server_scripts/war_system.js
 └── Tâches : Commande /war conflict, prélèvement 250R x 2, timer 60 min, paiement 500R au vainqueur.

[Phase 4 : Capture The Flag (Autels & Drapeau)]
 └── Fichier : kubejs/server_scripts/war_flag.js
 └── Tâches : Clic autel, gestion NBT drapeau, glowing, blocage perles/home/backpack, drop à la mort.
```
