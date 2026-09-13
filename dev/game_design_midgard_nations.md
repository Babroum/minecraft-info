# Règlement & Fonctionnement Officiel du Serveur : Nations & Guerres

> **Configuration** : ~15 joueurs | Équipes de 3 joueurs max par Nation | Pas de Waystones | Pas de commande `/spawn`  
> **Principe directeur** : Des règles nettes, strictes et sans zone grise.

---

## 1. Vue d'Ensemble & Boucle de Jeu

```
                         ┌────────────────────────────────────┐
                         ▼                                    │
               1. INDUSTRIE & AUTOMATISATION (Create / Mekanism)
                         │
                         ▼
               2. MARCHÉ ONU (Contrats Quotidiens & Hebdomadaires)
                  → Injection de Robert Coins (R) dans l'économie
                         │
                         ▼
               3. TERRITOIRE & BANQUES D'ÉTAT
                  → Claims FTB Chunks & Impôts territoriaux
                         │
                         ▼
               4. AFFRONTEMENTS (Deux formats distincts)
                  ├─ Conflit (Escarmouche CTF : 250R/camp, 0 explosif, casse manuelle)
                  └─ Guerre (Siège lourd : 2500R attaquant, pillage, explosions hors sanctuaires)
                         │
                         └────────────────────────────────────┘
```

---

## 2. Le Moteur Économique : Les Contrats de l'ONU

L'ONU est le guichet central d'injection monétaire au spawn neutre.

### A. Contrats Quotidiens (Format Sprint)
* **Objectif** : Générer de l'activité journalière.
* **Fonctionnement** :
  * Quotas légers de ressources brutes ou transformées (fer, cuivre, nourriture, mécanismes).
  * **Course de vitesse** : La première nation qui livre la totalité au guichet valide le contrat et encaisse la récompense.
  * **Répartition des gains** : 85% à 90% versés sur le compte de la Banque Nationale (`/nation bank`), 10% à 15% remis au joueur livreur sous forme de billets physiques.

### B. Contrats Hebdomadaires (Format Quota Collectif)
* **Objectif** : Récompenser l'organisation et la régularité sans pénaliser les horaires des joueurs.
* **Fonctionnement** :
  * Appel d'offres ouvert du **lundi 00h00 au dimanche 23h59**.
  * **Aucune concurrence entre nations** : Chaque nation dispose de sa propre jauge d'avancement.
  * **Dépôt progressif** : N'importe quel membre de la nation peut déposer ses stocks au fil de la semaine pour faire monter la jauge collective de son équipe.
  * Dès que la jauge atteint 100%, la nation encaisse la prime d'État complète.
* **Bonus de Série (Streak)** :
  * Valider le contrat hebdo plusieurs semaines d'affilée augmente les gains de la nation (+5% semaine 2, +10% semaine 3, jusqu'à +25% max).
  * Une semaine manquée réinitialise la série à zéro.

---

## 3. Matrice des Affrontements : Conflit vs Guerre

| Paramètre | Conflit (Escarmouche CTF) | Guerre (Siège) |
| :--- | :--- | :--- |
| **Objectif** | Voler l'Étendard (Flag) adverse et le ramener | Domination totale de la base adverse |
| **Coût financier** | **250 R par nation** (les deux camps payent) | **2500 R payés par l'attaquant seul** |
| **Gain à la victoire** | **Le gagnant rafle les 500 R** du pot commun | **Rien** (aucun versement automatique) |
| **Pillage des coffres** | ❌ **Strictement interdit** | ✔ **Autorisé** (pillage libre des coffres) |
| **Conditions de lancement** | **Au moins 1 joueur connecté par camp** | Accord préalable + préavis fixé |
| **Préavis de début** | 5 minutes après l'annonce | 24 heures à l'avance |
| **Créneau horaire** | Libre (dès que la condition en ligne est vérifiée) | Fenêtre fixe de siège (18h00 - 22h00) |
| **Durée limite** | **60 minutes max** (match nul si non résolu) | Jusqu'à 4 heures (fin à 22h00) |
| **Destruction à la main** | ✔ **Autorisée** (outils, pioches, casse de blocs) | ✔ **Autorisée** partout |
| **Explosions (CBC/Ballistix/TNT)** | ❌ **Désactivées (0% dégât de blocs)** | ✔ **Actives**, sauf dans les chunks sanctuaires |
| **Chunks Sanctuaires** | Sans objet (explosions déjà coupées partout) | ✔ **Quantité libre, définie par l'admin** |

---

## 4. Le Conflit (Capture the Flag) : Règles & Sécurités

Le Conflit est un assaut d'infanterie rapide sans arme lourde.

### A. Déroulement du Match
1. Une nation lance le conflit contre une autre : chaque camp est débité de 250 R.
2. Les attaquants ont **60 minutes** pour pénétrer dans la base adverse, extraire le drapeau de l'autel ennemi et le ramener à leur propre autel (ou au guichet de l'ONU).
3. **Issue** :
   * **Capture réussie** : La nation victorieuse encaisse les **500 R**.
   * **Échec du chrono (60 min)** : Le match s'arrête en match nul. Les 500 R sont perdus (gardés par l'ONU).

### B. L'Autel et l'Encastrement du Drapeau
* Chaque nation possède un bloc d'autel officiel déclarant son drapeau.
* **Verrouillage automatique** : Dès le lancement du conflit, l'autel est verrouillé pour les défenseurs. Ils ne peuvent pas retirer le drapeau pour le cacher. Seuls les attaquants peuvent l'extraire par clic droit.
* **Encastrement du Flag** :
  * Les pièges, labyrinthes, portes codées et systèmes de défense sont vivement encouragés.
  * **Puisque la casse de blocs à la main est autorisée en conflit, il n'est pas interdit d'encastrer son autel** derrière des murs ou de la pierre. Les attaquants devront simplement forcer le passage à la pioche.
  * **Arbitrage Admin** : L'administration intervient et tranche uniquement en cas d'abus manifeste rendant l'extraction matériellement impossible par les mécaniques du jeu.

### C. Règles de Transport du Flag
* **Visibilité** : Le porteur reçoit l'effet lumineux **Glowing** permanent (silhouette visible à travers les murs) et ses coordonnées sont régulièrement diffusées dans le chat.
* **Interdiction de téléportation** : Commandes `/home` et perles de l'Ender strictement désactivées tant que le drapeau est sur le joueur (rappel : pas de Waystones ni de `/spawn` sur le serveur).
* **Interdiction de stockage** : Impossible de ranger le drapeau dans un sac à dos *Sophisticated Backpacks* ou un *Enderchest*. Il doit impérativement rester dans l'inventaire direct du joueur.
* **Mort du porteur** :
  * Le drapeau tombe au sol à l'endroit exact du décès sous forme d'item persistant (incassable, ne despawn pas).
  * **Si un défenseur touche le drapeau au sol** : Le drapeau retourne **instantanément à son autel d'origine** (sécurisation réussie).
  * **Si un autre attaquant le ramasse** : La course continue.
* **Anti Déconnexion (Combat-Log)** : Déconnexion avec le drapeau sur soi = mort automatique immédiate, le drapeau tombe au sol et une annonce est faite dans le chat.

---

## 5. La Guerre (Siège) : Explosions, Pillage et Sanctuaires

La Guerre est l'affrontement lourd à grande échelle.

### A. Coût et Absence de Récompense Serveur
* L'attaquant assume seul le risque financier : **il paye 2500 R** pour ouvrir la guerre.
* **Le serveur ne verse aucun argent au vainqueur**.
* Le bénéfice de la guerre provient exclusivement :
  * Du **pillage direct** des ressources adverses.
  * Des conditions négociées dans le **Traité de Paix** post-guerre (tributs, accords commerciaux, concessions de territoires).

### B. Règles de Destruction & Pillage
* **Pillage des coffres** : En temps de guerre, le pillage des coffres, barils et machines de stockage ennemis est **totalement autorisé**.
* **Casse de blocs & Explosifs** : L'artillerie Create Big Cannons, les missiles Ballistix, la TNT et la casse manuelle sont pleinement actifs sur toute la base ennemie, **à l'exception stricte des Chunks Sanctuaires**.

### C. Les Chunks Sanctuaires (Protection Admin)
* **Désignation** : Avant le déclenchement de la guerre, l'administrateur inspecte la base avec la nation qui va subir le siège.
* **Nombre de chunks** : **L'admin peut claim autant de chunks sanctuaires qu'il le juge nécessaire** pour englober et protéger les beaux builds, mairies, architectures complexes ou monuments historiques.
* **Règle dans le Sanctuaire** :
  * **Les explosions y sont 100% désactivées**. Aucun tir de canon ni missile ne peut y causer de dégâts de blocs.
  * Les structures architecturales majeures sont ainsi préservées de la pulvérisation par arme lourde.

---

## 6. Synthèse des Règles pour les Joueurs

| Situation | Ce qui est appliqué |
| :--- | :--- |
| **Je lance un conflit** | Ma nation paye 250 R, l'ennemi paye 250 R. Si je ramène leur flag en moins de 60 min, on prend les 500 R. |
| **On m'attaque en conflit** | Zéro missile, zéro canon destructeur. Les ennemis peuvent casser des blocs à la pioche pour atteindre mon autel. Si mon équipe touche notre flag tombé au sol, il revient directement à sa place. Mes coffres ne peuvent pas être pillés. |
| **Je lance une guerre** | Ma nation paye 2500 R seule. Le serveur ne me donnera rien si je gagne : mon gain est le pillage des coffres ennemis et les traités diplomatiques. |
| **Mes beaux bâtiments en guerre** | Ils sont protégés par les **chunks sanctuaires** posés par l'admin (nombre illimité selon les besoins). Les explosions n'y font aucun dégât de blocs. |
| **Mon stuff personnel (inventaire)** | Perdu uniquement si tué en PvP selon les règles de mort normales du serveur. |
