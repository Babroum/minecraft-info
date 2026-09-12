# Bible de Conception & Guide du Serveur : Nations & Géopolitique

> **Format du serveur** : ~15 joueurs | Équipes de 3 joueurs max par Nation | Style Géopolitique / Semi-RP / Guerre encadrée  
> **Objectif central** : Supprimer l'effet "one-shot" où une défaite dégoûte une équipe, et garantir de l'activité permanente sans dépendre uniquement des grandes guerres.

---

## 1. La Boucle de Gameplay Permanente

Pour éviter qu'un serveur s'éteigne entre deux guerres ou tourne en rond, la progression repose sur un cycle à 4 piliers :

```
       ┌────────────────────────────────────────────────────────┐
       ▼                                                        │
1. INDUSTRIE & FARM (Create / Mekanism)                        │
       │                                                        │
       ▼                                                        │
2. ÉCONOMIE ONU (Contrats Quotidiens & Hebdomadaires)           │
   → Rémunération en monnaie (Trésor national & prime joueur)  │
       │                                                        │
       ▼                                                        │
3. EXPANSION & TENSION GÉOPOLITIQUE                             │
   → Claim de territoires (FTB Chunks)                          │
   → Taxes territoriales hebdomadaires & Alliances              │
       │                                                        │
       ▼                                                        │
4. CONFRONTATIONS ENCADRÉES                                     │
   ├─ Conflits réguliers (CTF, casse manuelle, zéro explosif)   │
   └─ Grandes Guerres (Planifiées, artillerie, sanctuaires)    │
       │                                                        │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Le Moteur Économique : Les Marchés de l'ONU

L'ONU (située au spawn neutre) est le cœur battant de l'économie. C'est elle qui injecte la monnaie (`Robert Coins - R`) dans le serveur pour payer les taxes de claim, acheter des technologies militaires et commercer entre nations.

### A. Les Contrats Quotidiens (Format "Sprint")
* **Objectif** : Une raison de se connecter chaque jour pour les joueurs actifs.
* **Fonctionnement** : 
  * Rotation automatique de petits quotas (ex: 64 lingots d'acier, 32 mécanismes, 3 caisses de nourriture).
  * **Logique de course** : Première nation à livrer au guichet = encaisse la prime.
  * Répartition automatique : 85% à 90% vont à la **Banque Nationale**, 10% à 15% vont dans la poche du **Livreur** en billets physiques.

### B. Les Contrats Hebdomadaires (Format "Chantier National")
* **Pourquoi** : Éviter que les joueurs du soir ou les petites nations soient toujours devancés par les mêmes équipes ultra-réactives.
* **Fonctionnement** :
  * **Quota cumulé sans compétition** : Toutes les nations ont le même appel d'offres ouvert du lundi 00h00 au dimanche 23h59.
  * **Livraison fractionnée (Jauge d'équipe)** : Les membres d'une nation déposent leurs surplus au fur et à mesure (ex: objectif de 1000 rails ou 200 circuits). Chaque livraison fait monter la jauge collective de la nation.
  * Dès que la jauge atteint 100%, la prime complète est débloquée pour la nation.
* **Bonus de Régularité (Série / Streak)** :
  * Si une nation valide son contrat hebdo plusieurs semaines consécutives, elle débloque un bonus permanent sur les versements ONU (+5% semaine 2, +10% semaine 3, jusqu'à +25%).
  * Si une semaine est manquée, le bonus retombe au niveau de base.

---

## 3. Deux Paliers d'Affrontement : Conflit vs Guerre

Pour combler le vide entre deux guerres rares et coûteuses, les affrontements sont séparés en deux catégories distinctes :

| Critère | Conflit (Escarmouche CTF) | Grande Guerre |
| :--- | :--- | :--- |
| **Objectif** | Capture the Flag (infiltration tactique) | Siège lourd, domination, capitulation |
| **Fréquence** | Fréquent (plusieurs fois par semaine) | Rare (1 fois toutes les 2 à 3 semaines) |
| **Coût de lancement** | Symbolique (250 R) | Élevé (2500 R) |
| **Condition de départ** | **Au moins 1 joueur connecté** dans chaque camp | Accord préalable + validation planifiée |
| **Préavis** | Alerte de 5 minutes dans le chat | Annoncée au moins 24h à l'avance |
| **Créneau** | N'importe quand (si les deux camps sont co) | Fenêtre fixe de siège (18h00 - 22h00) |
| **Durée** | Strictement limitée : **60 minutes max** | Toute la soirée (jusqu'à 4 heures) |
| **Casse manuelle** | **AUTORISÉE** (pioche, outils, brèches manuelles) | **AUTORISÉE** partout |
| **Dégâts d'explosifs**| **DÉSACTIVÉS (0%)** (pas de TNT, canons ni missiles) | **ACTIFS PARTOUT**, sauf sur les sanctuaires |
| **Sanctuaire protégé**| Aucun (on protège par les armes et portes) | **Définis par l'admin avant la guerre (anti-explosions)** |
| **Conséquences** | Prime ONU au vainqueur, pas de traité | Traité de paix, redécoupage, tributs |

---

## 4. Règles de Destruction des Blocs & Équilibrage des Armes

C'est le point d'équilibre fondamental : permettre l'assaut sans détruire inutilement l'investissement des joueurs.

### A. En Conflit (Infiltration & Combat Tactique)
* **Casse de blocs à la main** : **AUTORISÉE**. Les attaquants peuvent forcer une porte, miner un mur à la pioche ou poser des échelles pour entrer dans la base ennemie.
* **Explosifs & Artillerie** : **INTERDITS OU INOFFENSIFS POUR LES BLOCS**. Aucun missile Ballistix, aucun tir de canon Create Big Cannons ni TNT ne détruit de blocs. Le conflit reste centré sur l'habileté des joueurs, les armes à feu d'infanterie (Point Blank) et la tactique d'assaut au corps-à-corps.

### B. En Grande Guerre (Siège Lourd & Artillerie)
* **Dégâts d'explosifs généralisés** : Les tirs de canons Create Big Cannons, les missiles Ballistix et la TNT démolissent les blocs sur tout le territoire ennemi pour éventrer les défenses et forcer les brèches.
* **Les Chunks Sanctuaires (Défini par l'Admin avant la guerre)** :
  * Lors de la phase de validation de la guerre (24h avant), **l'administrateur inspecte la base** et marque officiellement une zone sanctuarisée (typiquement jusqu'à 4 chunks clés).
  * **Rôle du sanctuaire** : Protéger les constructions d'exception, les monuments artistiques, les mairies historiques ou les beaux builds dont les joueurs sont fiers, pour que des heures d'architecture ne soient pas réduites en poussière.
  * **Règle absolue dans le sanctuaire** : **Les explosions y sont totalement désactivées**. Aucun missile Ballistix, obus de canon lourd ou TNT ne peut exploser ni détruire de blocs dans ces chunks sanctuarisés.
  * **Tous les autres chunks** (lignes de défense, tranchées, murailles extérieures, usines, avant-postes) subissent les dégâts d'explosion réels.

---

## 5. Le Capture the Flag (CTF) en Détail & Sécurités Anti-Abus

Le CTF est l'objectif numéro 1 du **Conflit**. Il crée une dynamique de capture sans piller les réserves personnelles des joueurs.

### Le Principe de Base
1. Chaque nation possède un **Autel National** placé dans sa base.
2. Pour gagner le conflit, les attaquants doivent infiltrer la base (en minant ou crochetant à la main), interagir avec l'autel pour extraire **l'Étendard de la Nation**, et le ramener vivant à l'ONU (ou à leur propre autel).
3. Si le chrono de 60 minutes expire sans capture, le conflit s'achève sur un **match nul** sans aucune perte.

---

### Points Techniques & Anti-Triche Verrouillés

#### 1. Verrouillage de l'Autel (Empêcher de cacher ou déplacer le Flag)
* **Emplacement officiel et enregistré** : L'autel est déclaré une fois pour toutes par la nation. Il ne peut pas être démonté ni déplacé librement par les joueurs en période de tension.
* **Verrouillage automatique en conflit** : Dès qu'un conflit est lancé contre une nation, son autel devient **scellé et indestructible pour ses propres membres**. Les propriétaires ne peuvent pas le ranger dans leur inventaire, un coffre ou un sac pour le cacher. Seuls les attaquants peuvent l'extraire.
* **Règle anti-"bunker plein"** : L'autel ne peut pas être encastré dans une masse pleine d'obsidienne sans chemin. Les attaquants ayant le droit de miner à la main en conflit, les portes blindées, pièges et labyrinthes sont encouragés, mais l'autel doit rester atteignable.

#### 2. Mécanique de Transport du Flag
* Quand un attaquant s'empare de l'étendard :
  * **Surbrillance obligatoire (Glowing)** : Le porteur reçoit l'effet de surbrillance lumineuse visible à travers les murs, et des coordonnées régulières sont envoyées dans le chat.
  * **Interdiction de téléportation** : Commandes `/home`, `/spawn`, Waystones et perles de l'Ender strictement désactivées tant que le drapeau est sur lui.
  * **Interdiction de sac à dos** : Impossible de ranger le drapeau dans un *Sophisticated Backpack* ou un enderchest. Il doit rester dans l'inventaire principal.

#### 3. Chute & Récupération en Cas de Mort
* Si le porteur du drapeau est tué :
  * Le drapeau tombe au sol sous forme d'item persistant (immunisé contre la lave et le despawn).
  * **Si un défenseur touche le drapeau au sol** : Le drapeau retourne **instantanément à son autel d'origine** (sécurisation réussie).
  * **Si un autre attaquant le ramasse** : La course continue.

#### 4. Anti-Déconnexion en Combat (Combat-Log)
* Si le porteur du drapeau se déconnecte avec le drapeau sur lui : mort instantanée, drop du drapeau sur place et annonce publique dans le chat.

---

## 6. L'Après-Guerre & Protocole Anti-Ragequit

La défaite doit avoir un coût diplomatique et financier, mais **ne doit jamais anéantir le travail de fond des joueurs**.

### Ce qui n'arrive JAMAIS :
* ❌ Pas de vol des coffres de stockage des joueurs.
* ❌ Pas de destruction des chunks sanctuaires validés par l'admin.
* ❌ Pas de pillage d'inventaire personnel hors stuff perdu à la mort classique en PvP.

### Ce qui se passe après une défaite :
1. **Indemnité de Guerre Fixée par l'ONU** :
   * Le vainqueur reçoit une prime payée en grande partie par le Trésor de l'ONU, complétée par un prélèvement modéré sur la banque d'État adverse (ex: 20% max du trésor public).
2. **Trêve Forcée de l'ONU (7 jours)** :
   * La nation vaincue est protégée contre toute nouvelle déclaration de guerre pendant 7 jours.
3. **Plan de Relance (Plan Marshall)** :
   * La nation vaincue conserve l'intégralité de ses coffres et ses bâtiments sanctuarisés intacts.
   * Bonus de +15% sur les contrats quotidiens de l'ONU pendant la trêve pour se refaire rapidement une trésorerie.
4. **Solidarité des Alliances** :
   * Possibilité pour les alliés de transférer des fonds de banque à banque (`/nation bank transfer`) pour aider à la reconstruction.

---

## 7. Tableau Récapitulatif pour les Joueurs

| Question d'un joueur | Réponse du serveur |
| :--- | :--- |
| *"Est-ce qu'on peut détruire ma base à coup de missiles ?"* | **En conflit : non** (explosifs inoffensifs). **En guerre : oui**, sauf sur les **chunks sanctuaires définis par l'admin** où les explosions sont désactivées. |
| *"Comment sont choisis les chunks sanctuaires ?"* | L'admin inspecte votre base avant la guerre et valide avec vous jusqu'à 4 chunks abritant vos plus beaux builds, monuments ou mairie. |
| *"Est-ce qu'en conflit les ennemis peuvent casser mes blocs ?"* | **Oui, mais uniquement à la main** (pioches, outils). Ils peuvent percer un mur ou casser une porte pour chercher le drapeau, mais pas faire sauter le quartier. |
| *"Est-ce qu'on peut me piller mes coffres de farm ?"* | **Non.** Aucun accès direct aux coffres de stockage. Seuls les objectifs de guerre/conflit rapportent de l'argent. |
