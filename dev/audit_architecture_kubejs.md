# Audit & Critique Architecturale du Dossier KubeJS (Serveur Midgard / Third World)

> **Projet** : Midgard / Third World Server  
> **Composant audité** : Répertoire `kubejs/` (serveur, client, startup, data)  
> **Version cible** : Minecraft NeoForge 1.21.1 / KubeJS 21.1.x  
> **Date de l'audit** : 13 Septembre 2026  
> **Auteur** : Antigravity (Assistant d'Architecture Système)

---

## Résumé Exécutif

Le dossier `kubejs/` de ce projet concentre l'ensemble de la logique métier et du gameplay distinctif du serveur : **moteur de guerres et sièges, capture the flag (CTF), bourse dynamique (AMM), appels d'offres de l'ONU, fiscalité territoriale, banques de nations (Lightman's Currency), diplomatie (FTB Teams/Chunks) et interfaces graphiques (FTB Library)**.

Le volume de code est conséquent : **plus de 25 scripts dans `server_scripts/` cumulant plus de 11 000 lignes de JavaScript interprété (~450 Ko de code)**, complété par 790 lignes côté client et une dizaine de fichiers de données JSON.

**Constat principal** : KubeJS a été détourné de sa fonction première (glue code, équilibrage de recettes, hooks d'événements légers) pour devenir un **framework applicatif monolithique complexe**. Bien que fonctionnel et d'une grande richesse fonctionnelle, le système souffre de **dettes techniques critiques** en matière de performance (I/O bloquants sur le tick loop, surcharge de polling tick), de fiabilité des données (risques de corruption JSON, concurrence sans transaction), de maintenabilité (pollution du scope global, duplication de code, gestion d'erreurs aveugle) et de sécurité réseau.

---

## 1. Cartographie & Volumétrie du Composant

```
kubejs/
├── assets/                     # Textures, modèles, sons customs
├── startup_scripts/            # Enregistrement des items & armures (exécuté au boot NeoForge)
│   ├── economy_items.js        # Billets de banque (1, 5, 20, 100 R)
│   └── military_armor.js       # Armures militaires & Juggernaut Uranium
├── client_scripts/             # Interfaces graphiques FTB Library côté client
│   └── ftb_ui.js               # 790 lignes : Bourse, Banque, Guerres, Contrats via JavaAdapter
├── data/                       # Base de données locale en fichiers JSON plats
│   ├── wars.json               # Registre des conflits et guerres actives
│   ├── sanctuaries.json        # Chunks protégés des explosions
│   ├── onu_regular_config.json # Catalogue et pool des contrats réguliers
│   ├── onu_weekly.json         # Jauges et progressions hebdomadaires
│   ├── onu_market_data.json    # Stocks et cotations AMM de la bourse
│   ├── nation_taxes.json       # Registre fiscal et état des dettes
│   ├── nation_homes.json       # Coordonnées des QG de nations
│   └── alliances.json          # Traités et pactes diplomatiques
└── server_scripts/             # Logique serveur (25 scripts, >11 000 lignes)
    ├── ftb_helpers.js          # Utilitaires FTB, sérialisation et persistance (priorité 100)
    ├── dimension_blocker.js    # Verrouillage Nether/End (priorité 90)
    ├── elytra_disabled.js      # Interdiction élytres & jetpacks (priorité 80)
    ├── nation_homes.js         # Téléportation QG & warmup (priorité 70)
    ├── alliance_system.js      # Gestion des pactes & trahisons (priorité 60)
    ├── onu_teleport.js         # Téléportation QG ONU (priorité 60)
    ├── onu_claims.js           # Périmètre sécurisé du hub ONU (priorité 55)
    ├── war_raidhours.js        # Horaires de raids 18h-22h (priorité 55)
    ├── war_system.js           # Moteur complet des guerres (1732 lignes, priorité 50)
    ├── onu_contracts.js        # Appels d'offres ONU (1412 lignes, priorité 50)
    ├── war_admin.js            # Commandes staff de gestion de guerre (priorité 50)
    ├── nation_bank.js          # Intégration Lightman's Currency (priorité 50)
    ├── military_recipes.js     # Suppression et recettes de guerre (priorité 50)
    ├── territory_tax.js        # Prélèvement fiscal périodique (priorité 50)
    ├── exo_armor_weight.js     # Pénalité de vitesse armure uranium (priorité 50)
    ├── backpack_recipes.js     # Recettes sacs à dos (priorité 50)
    ├── war_flag.js             # Moteur CTF et autels nationaux (priorité 48)
    ├── war_sanctuary.js        # Sanctuaires anti-bombardement (priorité 48)
    ├── war_claims_hook.js      # Bypass de claim FTB Chunks en raid (priorité 45)
    ├── nation_chat_tab.js      # Canaux chat et synchronisation TAB (priorité 45)
    ├── onu_market.js           # Bourse mondiale automatisée (951 lignes, priorité 40)
    ├── dimensional_recipes.js  # Recettes selon dimensions (priorité 40)
    ├── nation_info.js          # Statistiques et puissances de nations (priorité 40)
    └── main.js                 # Point d'entrée (3 lignes)
```

---

## 2. Analyse Critique Détaillée

### A. Persistance des Données & Gestion de l'État (Niveau de Risque : ÉLEVÉ)

#### 1. I/O Disque Synchrones Bloquants sur le Thread Principal du Serveur
- **Problème** : Les fonctions pivots `readJsonData()` et `writeJsonData()` dans [`ftb_helpers.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/ftb_helpers.js) utilisent directement `java.nio.file.Files.readString()` et `Files.writeString()` sur le thread principal de jeu (Server Main Thread).
- **Conséquence** : Chaque action joueur importante (achat d'action au marché, déclaration de guerre, capture d'un drapeau, prélèvement fiscal horaire, validation d'un contrat d'approvisionnement) bloque le tick du serveur jusqu'à ce que le système d'exploitation ait écrit sur le disque.
- **Impact réel** : Chutes brutales de TPS (hiccups / micro-freezes) et avertissements console `"Can't keep up! Is the server overloaded?"`, particulièrement perceptibles lors des combats ou lors d'achats simultanés à la bourse.

#### 2. Risque de Corruption des Fichiers JSON par Écriture Non-Atomique
- **Problème** : L'écriture via `Files.writeString(f.toPath(), jsonStr, [])` tronque puis écrit directement dans le fichier cible.
- **Conséquence** : Si le serveur s'arrête brutalement (crash OOM, coupure serveur, arrêt forcé `SIGKILL` de l'hébergeur) en plein milieu d'une sérialisation de `wars.json` ou `onu_market_data.json`, le fichier se retrouve corrompu ou vidé (0 octet).
- **Absence de mitigation** : Aucun pattern d'écriture atomique (écriture dans un fichier `.tmp` suivie d'un `Files.move(tmpPath, targetPath, StandardCopyOption.ATOMIC_MOVE)`).

#### 3. Divergence et Désynchronisation Cache Mémoire vs Disque
- **Problème** : Deux politiques contradictoires coexistent :
  - Certains scripts gardent un cache mémoire global persistant (`WARS_CACHE` dans `war_system.js`, `ALTARS_CACHE` dans `war_flag.js`).
  - D'autres relisent le fichier disque à chaque exécution de fonction (`onu_regular_config.json`, `onu_teleport.json`, `sanctuaries.json`).
- **Conséquence** : Lors d'un rechargement à chaud (`/kubejs reload server_scripts`), les caches en mémoire sont vidés ou réinitialisés. Si une écriture intervient pendant une désynchronisation, l'état disque est écrasé par un état obsolète.

---

### B. Performance & Modèle d'Exécution : La Prolifération des Ticks (Niveau de Risque : ÉLEVÉ)

#### 1. Multiplication Anarchique des Écouteurs `ServerEvents.tick` (11 abonnements simultanés)
Au lieu d'un gestionnaire de tâches centralisé (Scheduler unique cadencé), **11 fichiers distincts** enregistrent chacun leur propre événement `ServerEvents.tick` :

| Fichier | Fréquence de calcul | Action exécutée |
| :--- | :--- | :--- |
| [`dimension_blocker.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/dimension_blocker.js#L53) | Toutes les 5 ticks (4 Hz) | Boucle sur tous les joueurs + concaténation de commandes de téléportation |
| [`elytra_disabled.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/elytra_disabled.js#L29) | Toutes les 10 ticks (2 Hz) | Boucle sur tous les joueurs + inspection de l'équipement torse |
| [`exo_armor_weight.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/exo_armor_weight.js#L14) | Toutes les 20 ticks (1 Hz) | Boucle sur tous les joueurs + 4 vérifications d'armure + modification d'attributs |
| [`war_claims_hook.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_claims_hook.js#L183) | Toutes les 20 ticks (1 Hz) | Boucle sur tous les joueurs + test de territoire + appels FTB Chunks API |
| [`war_system.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_system.js#L1722) | Toutes les 20 ticks (1 Hz) | Décompte des chronos de guerre, calculs de sièges |
| [`war_flag.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_flag.js#L654) | Toutes les 20 ticks (1 Hz) | Traçage radar, effets de glowing, vérification des autels |
| [`nation_chat_tab.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/nation_chat_tab.js#L325) | Toutes les 40 ticks (0.5 Hz) | Boucle sur tous les joueurs + extraction de nation + mise à jour Scoreboard |
| [`onu_contracts.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/onu_contracts.js#L1398) | Toutes les 20 ticks (1 Hz) | Surveillance des délais d'expiration des contrats |
| [`onu_claims.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/onu_claims.js#L636) | Périodique | Vérification de la zone démilitarisée de l'ONU |
| [`territory_tax.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/territory_tax.js#L142) | Toutes les 1200 ticks (1 min) | Calcul des taxes territoriales de tous les chunks claimés |
| [`onu_market.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/onu_market.js#L940) | Toutes les 36000 ticks (30 min) | Rééquilibrage algorithmique AMM du marché |

#### 2. Polling Inefficace vs Architecture Orientée Événements (Event-Driven)
- **Exemple 1 (`dimension_blocker.js`)** : Boucle 4 fois par seconde sur tous les joueurs pour vérifier s'ils sont dans le Nether/End et exécute `server.runCommandSilent(...)`.  
  *Alternative optimale* : Intercepter l'événement natif de téléportation / changement de dimension (`PlayerEvents.changeDimension` ou `EntityEvents.changeDimension`). Zéro coût CPU hors téléportation.
- **Exemple 2 (`nation_chat_tab.js`)** : Boucle toutes les 2 secondes sur tous les joueurs pour recalculer leur préfixe Scoreboard via de multiples itérateurs FTB Teams.  
  *Alternative optimale* : Ne recalculer le préfixe qu'au login (`PlayerEvents.loggedIn`), au changement de rôle ou lors d'une commande `/nation`.

#### 3. Coût de la Passerelle JS-Java (Rhino Bridge & Reflection)
- Chaque appel depuis l'interpréteur JavaScript vers les structures de données Java (`Java.loadClass`, itérateurs `java.util.List`, conversions de chaînes, conversions via `toJsObject()`) génère de l'instanciation d'objets intermédiaires.
- Exécuter ces passages de pont à chaque tick pour chaque joueur connecté crée une pression permanente sur le Garbage Collector (GC pauses).

---

### C. Modularité, Couplage & Hygiène du Code (Niveau de Risque : MOYEN À ÉLEVÉ)

#### 1. Pollution du Scope Global Rhino et Fragilité des Priorités
- En KubeJS, tous les scripts partagent le **même espace de noms global**.
- L'utilisation massive du mot-clé `var` expose chaque fonction et variable au risque d'être écrasée par inadvertance par un autre script (`var server`, `var data`, `var now`, `var config`...).
- L'ordre d'initialisation dépend uniquement des métadonnées `// priority: XX` (de 40 à 100). Si deux scripts ont la même priorité ou si une dépendance croisée existe, des fonctions sont appelées alors qu'elles sont encore `undefined`.
- Pour pallier cette instabilité, les développeurs ont multiplié les gardes de type :
  ```javascript
  if (typeof handleFlagCaptureAtOnu === 'function') { ... }
  if (typeof isRaidHourActive === 'function') { ... }
  if (typeof withdrawNationMoney === 'function') { ... }
  ```
  Ce pattern masque la chaîne de dépendance et rend les régressions quasi indétectables sans tests manuels exhaustifs.

#### 2. Duplication de Code (Violations du Principe DRY)
- **Méthodes CRUD dupliquées** : Les fonctions `getWar()`, `setWar()`, `deleteWar()` sont définies à l'identique dans [`ftb_helpers.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/ftb_helpers.js#L96-L135) et recopiées mot pour mot dans [`war_system.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/server_scripts/war_system.js#L15-L61).
- **Constantes magiques répétées** : Les coordonnées du hub de l'ONU (`x: -204, z: -172`) sont redéfinies en dur dans 4 fichiers distincts :
  - `onu_contracts.js` (ligne 7)
  - `onu_market.js` (ligne 11)
  - `onu_claims.js` (ligne 7)
  - `onu_teleport.js` (ligne 14)  
  Si le QG est déplacé un jour, l'oubli d'un seul fichier provoquera une incohérence systémique majeure (ex: le marché à un endroit, la zone de livraison à un autre, la zone protégée ailleurs).
- **UUIDs codés en dur** : L'identifiant de la team ONU (`cb440140-1d45-4eff-9b10-2bab3d457d63`) est répété dans `war_system.js`, `war_claims_hook.js` et `onu_claims.js`.

#### 3. Gestion d'Erreurs Silencieuse (`Silent Catch`)
- Présence de plus de 80 blocs `try { ... } catch (e) {}` totalement muets à travers les scripts.
- Si une méthode interne d'un mod tiers (ex: `FTBTeamsAPI.getManager()`) échoue suite à une mise à jour ou un état corrompu, l'exception est étouffée sans message console. Le joueur ne reçoit aucun retour, et les administrateurs n'ont aucune trace dans les logs pour diagnostiquer la panne.

---

### D. Interface Client & Couche Réseau (Niveau de Risque : MOYEN)

#### 1. Dépendance Extrême aux Classes Internes de FTB Library (`ftb_ui.js`)
- Le script client [`ftb_ui.js`](file:///c:/Users/serva/Desktop/minecraft-info/kubejs/client_scripts/ftb_ui.js) (790 lignes) instancie dynamiquement les composants d'interface Java (`ButtonListBaseScreen`, `SimpleButton`, `ItemIcon`, `ContextMenuItem`) via l'adaptateur de classe Rhino `JavaAdapter`.
- Bien qu'ingénieux, ce mécanisme est **extrêmement fragile** : la moindre modification de signature de méthode ou de constructeur dans FTB Library lors d'une mise à jour de modpack rendra l'interface totalement inopérante côté client sans préavis.

#### 2. Sécurité Réseau et Validation Côté Serveur
- Les interactions de l'UI envoient des chaînes JSON brutes via des paquets custom KubeJS (`Client.sendData(channel, { json: jsonStr })`).
- Côté serveur, bien que des vérifications de distance et de compte bancaire existent, il n'y a pas de validateur formel de schéma (Schema Validator). Un client moddé capable d'injecter des paquets sur ces canaux pourrait tenter de passer des valeurs numériques négatives ou mal formées si la validation n'est pas imperméable à 100%.

---

### E. Adéquation Technologique : KubeJS vs Mod Java Dédié (NeoForge)

Le constat architectural le plus important est le **désalignement entre l'outil et l'objectif** :

```
          Domaine Naturel de KubeJS                  Domaine Actuel du Projet Midgard
  ┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
  │ - Recettes de craft / four / machines   │       │ - Moteur de guerre multi-états (1.7k L)│
  │ - Tables de loot et tags d'items       │  VS   │ - Algorithme de marché AMM (950 L)     │
  │ - Ajustement rapide de stats d'items   │       │ - Moteur CTF et radars en temps réel   │
  │ - Petits scripts de quêtes et triggers │       │ - Intégration bancaire & impôts        │
  └────────────────────────────────────────┘       │ - GUI complexes via JavaAdapter        │
                                                   └────────────────────────────────────────┘
```

| Critère | KubeJS (JavaScript / Rhino) | Mod Java / Kotlin Dédié (NeoForge) |
| :--- | :--- | :--- |
| **Typage & Sécurité** | Dynamique, erreurs au runtime | Typage fort statique, erreurs à la compilation |
| **Performance d'Exécution** | Interprété, overhead Rhino, GC pressure | Compilé en bytecode JVM natif, zero overhead |
| **Intégration API Mods** | Réflexion (`Java.loadClass`), conversions | Imports Java directs, compilation vérifiée par Gradle |
| **Persistance des Données** | JSON bloquant synchrone | `SavedData` Minecraft natif ou SQLite/LevelDB asynchrone |
| **Tests Automatisés** | Quasi impossibles sans serveur complet | Tests unitaires JUnit & mocks en CI/CD |
| **Refactoring & Maintenance** | Recherche textuelle risquée | Outils IDE avancés (renommage sûr, navigation de code) |

---

## 3. Plan de Recommandations & Feuille de Route d'Amélioration

### Phase 1 : Stabilisation Immédiate (Quick Wins sans réécriture)
1. **Écritures Atomiques et Sécurisation Disque** :
   - Modifier `writeJsonData()` dans `ftb_helpers.js` pour écrire d'abord dans un fichier `.tmp` puis effectuer un remplacement atomique (`StandardCopyOption.ATOMIC_MOVE`).
   - Ajouter un système de backup automatique `.bak` en cas de JSON corrompu.
2. **Centralisation des Constantes Métier** :
   - Créer un fichier de configuration unique prioritaire (`config_globals.js`, priorité 105) regroupant :
     - Coordonnées du Hub ONU (`-204, -172`) et rayons autorisés.
     - UUIDs officiels des entités système.
     - Horaires de raid et coûts de guerre.
3. **Nettoyage du Code Dupliqué** :
   - Supprimer les déclarations redondantes de `getWar`, `setWar`, `deleteWar` dans `war_system.js` au profit de `ftb_helpers.js`.
4. **Journalisation Sélective des Erreurs** :
   - Remplacer les `catch (e) {}` silencieux des opérations critiques (achats, guerres, impôts) par `console.error('[Module] Contexte : ' + e)`.

### Phase 2 : Optimisation des Performances (Réduction du Tick Sprawl)
1. **Création d'un Ticker Centralisé (`MasterScheduler.js`)** :
   - Remplacer les 11 `ServerEvents.tick` par un seul écouteur maître qui dispatche les tâches aux différentes fréquences :
     - Chaque seconde (20 ticks) : décomptes de guerre, CTF.
     - Toutes les 2 secondes (40 ticks) : vérification d'équipement et scoreboard.
     - Chaque minute (1200 ticks) : impôts territoriaux.
     - Toutes les 30 minutes : rééquilibrage de la bourse.
2. **Migration vers de l'Event-Driven pur** :
   - Supprimer le tick de `dimension_blocker.js` au profit d'un hook d'événement de changement de dimension.
   - Supprimer le tick de `nation_chat_tab.js` au profit d'une mise à jour uniquement à la connexion ou au changement d'équipe.

### Phase 3 : Vision Long-Terme (Migration Stratégique)
1. **Conserver dans KubeJS** :
   - `military_recipes.js`, `dimensional_recipes.js`, `backpack_recipes.js` (son rôle légitime).
   - Les modifications d'attributs cosmétiques ou règles légères de serveur.
2. **Migrer vers un Mod NeoForge Compilé (ex: `MidgardCore` en Java/Kotlin)** :
   - Le moteur de guerre et de siège (états, chronomètres, gestion des autels).
   - Le système bancaire et les taxes (sécurité financière absolue, zéro risque de duplication).
   - La bourse dynamique AMM et les contrats publics de l'ONU.
   - Les interfaces graphiques FTB (code natif Java sans reflection instable).

---

## 4. Matrice d'Évaluation Architecturale

| Dimension | Note | Commentaire de synthèse |
| :--- | :---: | :--- |
| **Richesse Fonctionnelle** | **9 / 10** | Gameplay exceptionnel, concepts poussés (AMM, CTF, guerres à paliers, intégration ONU). |
| **Robustesse & Intégrité** | **4 / 10** | I/O disque bloquants, risque réel de corruption JSON en cas de crash, catchs silencieux. |
| **Performance & Efficacité** | **4 / 10** | 11 écouteurs de tick concurrents, polling continu sur tous les joueurs, reflection intensive. |
| **Maintenabilité & Lisibilité**| **5 / 10** | Monolithes de 1500+ lignes, couplage fort par variables globales, duplication de constantes. |
| **Adéquation du Choix Technique**| **4 / 10** | Dépassement manifeste des limites de KubeJS pour une logique de type backend d'entreprise. |
| **NOTE GLOBALE** | **5.2 / 10** | **Projet remarquable sur le plan du Game Design, mais nécessitant une refonte technique pour garantir la fluidité (TPS) et la pérennité en production.** |
