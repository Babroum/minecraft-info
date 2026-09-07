import { useState, useMemo, useEffect } from "react";
import { useSync } from "./hooks/useSync";
import "./App.css";

export default function App() {
  const {
    config,
    status,
    launchStatus,
    isRunning,
    isLaunching,
    isGameRunning,
    error,
    startSync,
    launchMinecraft,
  } = useSync();

  const [currentScreen, setCurrentScreen] = useState<"main" | "settings">("main");

  // Pseudo Joueur (stocké en local, prêt pour auth Microsoft/offline)
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("mc_username") || "Player";
  });

  // Allocation RAM exacte en Mo (saisie libre, ex: 4096, 5120, 6144...)
  const [ramMb, setRamMb] = useState<number>(() => {
    const saved = localStorage.getItem("mc_ram_mb");
    return saved ? Math.max(1024, parseInt(saved, 10)) : 4096;
  });

  // Emplacement personnalisé & URL API
  const [gameDirInput, setGameDirInput] = useState<string>(() => {
    return localStorage.getItem("mc_game_dir") || "";
  });
  const [modsUrlInput, setModsUrlInput] = useState<string>(() => {
    return localStorage.getItem("mc_mods_url") || "";
  });

  useEffect(() => {
    localStorage.setItem("mc_username", username);
  }, [username]);

  useEffect(() => {
    localStorage.setItem("mc_ram_mb", ramMb.toString());
  }, [ramMb]);

  useEffect(() => {
    localStorage.setItem("mc_game_dir", gameDirInput);
  }, [gameDirInput]);

  useEffect(() => {
    localStorage.setItem("mc_mods_url", modsUrlInput);
  }, [modsUrlInput]);

  const isBusy = isRunning || isLaunching;

  // Calcul du pourcentage global
  const activeProgress = useMemo(() => {
    if (isLaunching) return Math.min(100, Math.max(0, launchStatus.progress));
    if (isRunning) return Math.min(100, Math.max(0, status.total_progress));
    if (status.step === "done") return 100;
    return 0;
  }, [isLaunching, isRunning, launchStatus.progress, status.total_progress, status.step]);

  // Message d'état affiché
  const activeMessage = useMemo(() => {
    if (isLaunching) return launchStatus.message || "Lancement de Minecraft...";
    if (isRunning) return status.message;
    if (isGameRunning) return "Minecraft 1.21.1 est en cours d'exécution.";
    if (status.step === "done") return "Fichiers vérifiés et à jour.";
    return "Prêt à jouer.";
  }, [isLaunching, isRunning, isGameRunning, launchStatus.message, status.message, status.step]);

  // Déclencheur du bouton JOUER
  const handlePlay = async () => {
    const customUrl = modsUrlInput.trim() || undefined;
    const customDir = gameDirInput.trim() || undefined;

    // 1. Synchronisation des mods
    const syncSuccess = await startSync(customUrl, customDir);
    if (!syncSuccess) {
      return;
    }

    // 2. Lancement du jeu
    await launchMinecraft(username, ramMb, customDir);
  };

  const handleRamChange = (delta: number) => {
    setRamMb((prev) => Math.max(1024, prev + delta));
  };

  return (
    <div className="launcher-window">
      {/* En-tête Minecraft */}
      <header className="mc-header">
        <h1 className="mc-title">NATIONGLORY</h1>
        <div className="mc-subtitle">
          <span>MINECRAFT 1.21.1</span>
          <span>•</span>
          <span>FABRIC LOADER</span>
        </div>
      </header>

      {/* Vue Principale */}
      {currentScreen === "main" ? (
        <main className="mc-main-area">
          <div className="mc-box">
            {/* Saisie du Pseudo */}
            <div className="mc-input-group">
              <label className="mc-label" htmlFor="player-name">
                PSEUDO DU JOUEUR :
              </label>
              <input
                id="player-name"
                className="mc-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isBusy}
                maxLength={16}
                placeholder="Ex: Steve"
                autoComplete="off"
              />
              <div className="mc-input-hint">Mode local (authentification prête pour mise à jour)</div>
            </div>

            {/* Barre de progression style Minecraft */}
            {(isBusy || status.step === "done") && (
              <div className="mc-progress-box">
                <div
                  className="mc-progress-fill"
                  style={{ width: `${activeProgress}%` }}
                />
              </div>
            )}

            {/* Statut sous forme de chat Minecraft */}
            <div className="mc-status-text">
              <span>&gt; {activeMessage}</span>
              {isBusy && <span>{Math.round(activeProgress)}%</span>}
            </div>

            {/* Affichage d'erreur */}
            {error && (
              <div className="mc-error-banner">
                [ERREUR] {error}
              </div>
            )}
          </div>

          {/* Bouton JOUER principal */}
          <button
            className="mc-btn mc-btn-play"
            onClick={handlePlay}
            disabled={isBusy}
          >
            {isRunning
              ? "VÉRIFICATION DES MODS..."
              : isLaunching
              ? "LANCEMENT DE MINECRAFT..."
              : isGameRunning
              ? "JEU EN COURS D'EXÉCUTION"
              : "JOUER"}
          </button>

          {/* Ligne des options secondaires */}
          <div className="mc-action-row">
            <button
              className="mc-btn"
              style={{ flex: 1 }}
              onClick={() => setCurrentScreen("settings")}
              disabled={isBusy}
            >
              PARAMÈTRES
            </button>
            <button
              className="mc-btn"
              style={{ flex: 1 }}
              onClick={() => {
                const customUrl = modsUrlInput.trim() || undefined;
                const customDir = gameDirInput.trim() || undefined;
                startSync(customUrl, customDir);
              }}
              disabled={isBusy}
            >
              VÉRIFIER MODS
            </button>
          </div>
        </main>
      ) : (
        /* Vue Paramètres */
        <main className="mc-main-area">
          <div className="mc-settings-screen">
            <h2 className="mc-settings-title">PARAMÈTRES DU LAUNCHER</h2>

            {/* Allocation RAM Exacte */}
            <div className="mc-input-group">
              <label className="mc-label">MÉMOIRE RAM ALLOUEE (MO) :</label>
              <div className="mc-ram-control">
                <button
                  className="mc-btn mc-ram-btn"
                  onClick={() => handleRamChange(-1024)}
                >
                  -1G
                </button>
                <button
                  className="mc-btn mc-ram-btn"
                  onClick={() => handleRamChange(-512)}
                >
                  -512M
                </button>
                <input
                  className="mc-ram-input"
                  type="number"
                  step="256"
                  min="1024"
                  value={ramMb}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setRamMb(Math.max(1024, val));
                  }}
                />
                <button
                  className="mc-btn mc-ram-btn"
                  onClick={() => handleRamChange(512)}
                >
                  +512M
                </button>
                <button
                  className="mc-btn mc-ram-btn"
                  onClick={() => handleRamChange(1024)}
                >
                  +1G
                </button>
                <span className="mc-ram-preview">
                  = {(ramMb / 1024).toFixed(1)} Go
                </span>
              </div>
              <div className="mc-input-hint">
                Valeur exacte transmise à Java via -Xmx{ramMb}M
              </div>
            </div>

            {/* Emplacement du jeu */}
            <div className="mc-input-group" style={{ marginTop: "16px" }}>
              <label className="mc-label">EMPLACEMENT DU JEU :</label>
              <input
                className="mc-input"
                type="text"
                placeholder={config?.game_dir || "%APPDATA%/.serveur-info"}
                value={gameDirInput}
                onChange={(e) => setGameDirInput(e.target.value)}
              />
              <div className="mc-input-hint">
                Défaut : <code>%APPDATA%/.serveur-info</code> (ou variable <code>LAUNCHER_GAME_DIR</code>)
              </div>
            </div>

            {/* URL de l'API / Manifest */}
            <div className="mc-input-group" style={{ marginTop: "16px" }}>
              <label className="mc-label">URL DE L'API / MANIFEST :</label>
              <input
                className="mc-input"
                type="text"
                placeholder={config?.mods_url || "http://localhost:8080"}
                value={modsUrlInput}
                onChange={(e) => setModsUrlInput(e.target.value)}
              />
              <div className="mc-input-hint">
                Défaut : <code>http://localhost:8080</code> (ou variable <code>LAUNCHER_MODS_URL</code>)
              </div>
            </div>

            {/* Bouton Retour */}
            <button
              className="mc-btn"
              style={{ width: "100%", marginTop: "20px" }}
              onClick={() => setCurrentScreen("main")}
            >
              TERMINÉ
            </button>
          </div>
        </main>
      )}

      {/* Pied de page Minecraft */}
      <footer className="mc-footer">
        <div>
          <span>Dossier : </span>
          <span style={{ color: "var(--mc-white)" }}>
            {gameDirInput.trim() || config?.game_dir || "%APPDATA%/.serveur-info"}
          </span>
        </div>
        {isGameRunning && (
          <div className="mc-badge-running">
            [EN JEU]
          </div>
        )}
      </footer>
    </div>
  );
}
