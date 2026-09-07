# Mémo Projet NationGlory

## 📁 Architecture des dossiers
- `launcher/app` : Application desktop Minecraft (Tauri v2 + React)
- `launcher/api` : API HTTP pour distribuer le manifest (`/manifest.json`) et les mods (`/mods/*`)
- `modpacks` : Fichiers `.jar` des mods et `manifest.json` officiel
- `server` : Serveur Minecraft NeoForge 1.21.1
- `tools` : Scripts utilitaires (`generate-manifest.mjs`)

---

## ⚡ Commandes rapides (depuis la racine)

| Commande | Action |
|---|---|
| `npm run manifest` | Génère / met à jour le fichier `modpacks/manifest.json` avec les hashs SHA-256 |
| `npm run api:dev` | Démarre l'API de distribution en mode watch (`http://localhost:8080`) |
| `npm run api:start` | Démarre l'API de distribution en mode direct |
| `npm run app:dev` | Lance le Launcher desktop en mode développement |
| `npm run app:build` | Compile le binaire de production du Launcher |
| `npm run server:start` | Démarre le serveur Minecraft NeoForge (6 Go RAM) |

---

## ⚙️ Variables d'environnement (optionnelles)
- `LAUNCHER_MODS_URL` : URL de l'API (défaut : `http://localhost:8080`)
- `LAUNCHER_GAME_DIR` : Dossier du jeu (défaut : `%APPDATA%/.serveur-info`)
- `PORT` : Port de l'API (défaut : `8080`)
