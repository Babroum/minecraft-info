# Directives & Guide d'Implémentation Serveur : Midgard Nations & Guerres

Ce document constitue la feuille de route et le cadre technique obligatoire pour les agents intervenant sur ce projet. Il détaille l'implémentation du backend serveur pour les systèmes de **Contrats Hebdomadaires**, **Sanctuaires Anti-Explosions**, **Conflits (CTF)** et **Guerres**.

> [!NOTE]
> **Périmètre actuel** : Moteur serveur pur (`server_scripts/` et `data/`).  
> Les interfaces graphiques client (`client_scripts/ftb_ui.js`) seront implémentées dans une phase ultérieure. Le code serveur doit toutefois exposer des commandes propres et prévoir les points d'accroche réseau (`NetworkEvents` / paquets de synchro) pour le futur client FTB Library.

---

## 1. Stack Technique & Conventions Obligatoires

* **Plateforme** : Minecraft 1.21.1 (NeoForge 21.1.x)
* **Moteur de script** : KubeJS 21.1.x (JavaScript Rhino / Java 21)
* **Mods intégrés** :
  * `ftb-teams` / `ftb-chunks` / `ftb-library` (Gestion des nations, claims et permissions)
  * `lightmanscurrency` (Économie en Robert Coins `R`, billets physiques & banques)
  * `createbigcannons` & `ballistix` (Artillerie lourde et missiles)
  * `pointblank` (Armes à feu d'infanterie)
  * `sophisticatedbackpacks` (Sacs à dos - gestion anti-abus drapeau)
* **Règles d'écriture KubeJS** :
  * Toujours utiliser les utilitaires de persistance de [`ftb_helpers.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/ftb_helpers.js) : `readJsonData(filename)` et `writeJsonData(filename, data)`.
  * Convertir systématiquement les maps/listes Java via `toJsObject(val)`.
  * Ne jamais bloquer le thread principal : privilégier les vérifications légères et les timers `server.scheduleInTicks`.
  * Toujours manipuler les trésors de nation via `depositNationMoneyDirect(team, amount)` et `withdrawNationMoneyDirect(team, amount)` de [`nation_bank.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/nation_bank.js).

---

## 2. Architecture des Fichiers & Données (`kubejs/`)

### Fichiers de Données (`kubejs/data/`)
* `wars.json` : Registre des conflits et guerres.
* `altars.json` : Emplacement spatial des autels / drapeaux nationaux.
* `sanctuaries.json` : Chunks protégés des explosions par l'administration.
* `onu_contracts.json` : État du contrat quotidien mondial actif.
* `onu_weekly.json` : Jauges hebdomadaires cumulées et séries (streaks) des nations.

### Fichiers de Scripts (`kubejs/server_scripts/`)
* [`ftb_helpers.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/ftb_helpers.js) *(priorité 100)* : Helpers partagés.
* [`war_system.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_system.js) *(priorité 50)* : Moteur d'états des guerres et des conflits.
* `war_flag.js` *(priorité 50 - NOUVEAU)* : Moteur Capture the Flag (CTF).
* [`war_claims_hook.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_claims_hook.js) *(priorité 45)* : Interception de la casse, pillage et dégâts de blocs.
* `war_sanctuary.js` *(priorité 48 - NOUVEAU)* : Registre et commandes admin des chunks sanctuaires.
* [`onu_contracts.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/onu_contracts.js) *(priorité 50)* : Contrats ONU quotidiens et hebdomadaires.
* [`war_admin.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_admin.js) *(priorité 50)* : Commandes d'administration militaire.

---

## 3. Spécifications Détaillées des Modules

### Module A : Contrats Hebdomadaires ONU (`onu_contracts.js`)
1. **Principe** :
   * Quota collectif sans concurrence, réinitialisé chaque dimanche soir à 23h59 (UTC).
   * Dépôt fractionné au guichet physique de l'ONU (`X: -204, Z: -172`).
   * Tout joueur de l'équipe peut contribuer à la jauge (`entry.itemsDelivered[itemId] += count`).
2. **Validation & Bonus** :
   * Quand 100% du quota est atteint : prime créditée à la banque de nation (`depositNationMoneyDirect`).
   * Système de streak : +5% de bonus par semaine consécutive réussie (plafonné à +25%).
   * Commande joueur : `/onu weekly` (affiche la jauge, le temps restant et la série).

### Module B : Sanctuaires Admin Anti-Explosion (`war_sanctuary.js`)
1. **Principe** :
   * Protéger les constructions artistiques, mairies ou monuments historiques contre les explosions.
   * Nombre de chunks sanctuarisables : **Illimité** (à discrétion de l'admin).
2. **Commandes Admin** :
   * `/waradmin sanctuary add [label]` : Sanctuarise le chunk actuel du joueur.
   * `/waradmin sanctuary remove` : Retire le chunk actuel du registre.
   * `/waradmin sanctuary list <nation>` : Liste les chunks sanctuarisés.
3. **Interception des Explosions** :
   * Écouter `LevelEvents.explosionStart` (ou hook forge équivalent).
   * Si l'explosion se produit dans un chunk présent dans `sanctuaries.json` : annuler (`event.cancel()`).

### Module C : Moteur de Conflits vs Guerres (`war_system.js` & `war_claims_hook.js`)
1. **Conflit (Escarmouche CTF)** :
   * Commande : `/war conflict <nation>`
   * Conditions : Au moins 1 joueur connecté dans chaque camp (`server.getPlayerList().getPlayers()`).
   * Coût : **250 R débités de chaque banque nationale**.
   * Pot commun : `escrowPool = 500 R`.
   * Durée : **Timer strict de 60 minutes**. Si non capturé = match nul, l'ONU conserve le pot.
   * Règles de blocs :
     * **Casse à la main autorisée** dans le territoire adverse en conflit (`BlockEvents.broken`).
     * **Explosions 100% désactivées** (0% dégât de blocs).
     * **Pillage des coffres interdit**.
2. **Guerre (Siège Lourd)** :
   * Commande : `/war declare <nation>`
   * Coût : **2500 R payés par l'attaquant seul**.
   * Récompense automatique serveur : **0 R** (le gain est le pillage et les traités).
   * Règles de blocs :
     * **Explosions actives partout**, SAUF dans les chunks sanctuaires.
     * **Pillage de coffres totalement autorisé** (`BlockEvents.rightClicked` sur inventaires ennemis débloqué).

### Module D : Moteur Capture the Flag (`war_flag.js`)
1. **L'Autel** :
   * Commande d'initialisation : `/nation setaltar` (enregistre coordonnées et dimension dans `altars.json`).
   * En conflit, les propriétaires ne peuvent pas détruire leur autel (`BlockEvents.broken` annulé pour l'équipe défendue).
   * L'encastrement de l'autel par des blocs est toléré (les attaquants ayant le droit de casser à la main).
2. **Le Drapeau & Transport** :
   * Un attaquant fait un clic droit sur l'autel ennemi -> reçoit l'item officiel `Étendard National` (tag NBT `{NationFlag: 1b, TeamOrigin: "uuid"}`).
   * Effet permanent : Effet *Glowing* appliqué au porteur (`potion:glowing`).
   * Bloquer le rangement : `PlayerEvents.inventoryChanged` annule toute insertion dans un sac *Sophisticated Backpacks* ou un *Enderchest*.
   * Bloquer la fuite : `/home` et perles de l'Ender annulés tant que le flag est possédé (rappel : ni Waystones ni `/spawn` sur le serveur).
3. **Mort, Déconnexion & Sécurisation** :
   * `EntityEvents.death` : Le drapeau tombe au sol (entité item avec tag `{NoDespawn:1b,Invulnerable:1b}`).
   * Si un membre de la nation défendue touche le drapeau au sol : retour instantané à l'autel (`AT_BASE`).
   * `PlayerEvents.loggedOut` : Si déconnexion avec le drapeau -> `player.kill()`, drop au sol et broadcast chat des coordonnées.
4. **Victoire** :
   * Le porteur clique sur son propre autel national avec le drapeau ennemi.
   * Clôture du conflit, transfert des **500 R** du pot vers la banque du vainqueur.

---

## 4. Ordre des Tâches d'Implémentation (Roadmap)

Lors des sessions de développement, suivre rigoureusement cet ordre :

1. **Étape 1 : Contrats Hebdomadaires**
   * Ajouter le modèle `onu_weekly.json` et les fonctions dans [`onu_contracts.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/onu_contracts.js).
   * Implémenter le dépôt progressif au guichet et la commande `/onu weekly`.
2. **Étape 2 : Sanctuaires Anti-Explosions**
   * Créer `war_sanctuary.js` avec persistance `sanctuaries.json` et commandes `/waradmin sanctuary`.
   * Implémenter l'écouteur d'annulation d'explosions dans `war_claims_hook.js`.
3. **Étape 3 : Commandes & Gestion des Conflits**
   * Étendre [`war_system.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_system.js) pour gérer le type `CONFLICT`, les frais 250R/250R, le pot de 500R et le timer 60 min.
   * Adapter `war_claims_hook.js` pour autoriser la casse manuelle en conflit tout en interdisant le pillage de coffres.
4. **Étape 4 : Système Capture the Flag (CTF)**
   * Créer `war_flag.js` avec la gestion de l'autel, le drop à la mort, le glowing et les restrictions de TP/backpack.
   * Relier la capture du drapeau à la résolution du conflit et au paiement des 500 R.
5. **Étape 5 : Intégration Client / FTB Library (Phase ultérieure)**
   * Mettre à jour [`kubejs/client_scripts/ftb_ui.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/client_scripts/ftb_ui.js) pour ajouter les boutons et affichages graphiques (Jauge Hebdo, Conflit, Autel).
