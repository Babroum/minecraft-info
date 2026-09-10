import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface LauncherConfig {
  mods_url: string;
  game_dir: string;
  mods_dir: string;
}

export type SyncStep =
  | "idle"
  | "manifest"
  | "scanning"
  | "comparing"
  | "verifying"
  | "downloading"
  | "replacing"
  | "cleaning"
  | "done"
  | "error";

export interface SyncStatusPayload {
  step: SyncStep;
  message: string;
  current_file: string | null;
  current_index: number;
  total_files: number;
  file_progress: number;
  total_progress: number;
}

export interface SyncSummary {
  downloaded_count: number;
  replaced_count: number;
  deleted_count: number;
  up_to_date_count: number;
  total_mods: number;
}

export interface LaunchStatusPayload {
  step: string;
  message: string;
  progress: number;
}

// --- Auth types ---
export interface AuthResponse {
  success?: boolean;
  username?: string;
  token?: string;
  error?: string;
}

export interface VerifyResponse {
  valid?: boolean;
  username?: string;
  error?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  username: string | null;
  token: string | null;
}

export function useSync() {
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [status, setStatus] = useState<SyncStatusPayload>({
    step: "idle",
    message: "Prêt",
    current_file: null,
    current_index: 0,
    total_files: 0,
    file_progress: 0,
    total_progress: 0,
  });
  const [launchStatus, setLaunchStatus] = useState<LaunchStatusPayload>({
    step: "idle",
    message: "",
    progress: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  // --- Auth state ---
  const [auth, setAuth] = useState<AuthState>(() => {
    const savedToken = localStorage.getItem("mc_auth_token");
    const savedUsername = localStorage.getItem("mc_auth_username");
    return {
      isLoggedIn: false, // Will be verified on mount
      username: savedUsername,
      token: savedToken,
    };
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Charger la configuration effective au démarrage
  const loadConfig = useCallback(async (customUrl?: string, customDir?: string) => {
    try {
      const cfg = await invoke<LauncherConfig>("get_launcher_config", {
        customModsUrl: customUrl || null,
        customGameDir: customDir || null,
      });
      setConfig(cfg);
      return cfg;
    } catch (err) {
      console.error("Erreur lors de la récupération de la configuration :", err);
      return null;
    }
  }, []);

  // --- Auth functions ---
  const verifyToken = useCallback(async (token: string, customUrl?: string): Promise<boolean> => {
    try {
      const result = await invoke<VerifyResponse>("auth_verify", {
        token,
        customModsUrl: customUrl || null,
      });
      if (result.valid && result.username) {
        setAuth({
          isLoggedIn: true,
          username: result.username,
          token,
        });
        localStorage.setItem("mc_auth_token", token);
        localStorage.setItem("mc_auth_username", result.username);
        return true;
      }
    } catch {
      // Token invalid or expired
    }
    setAuth({ isLoggedIn: false, username: null, token: null });
    localStorage.removeItem("mc_auth_token");
    localStorage.removeItem("mc_auth_username");
    return false;
  }, []);

  const loginAccount = useCallback(async (username: string, password: string, customUrl?: string): Promise<boolean> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = await invoke<AuthResponse>("auth_login", {
        username,
        password,
        customModsUrl: customUrl || null,
      });
      if (result.success && result.token && result.username) {
        setAuth({
          isLoggedIn: true,
          username: result.username,
          token: result.token,
        });
        localStorage.setItem("mc_auth_token", result.token);
        localStorage.setItem("mc_auth_username", result.username);
        setAuthLoading(false);
        return true;
      }
      setAuthError("Réponse inattendue du serveur.");
      setAuthLoading(false);
      return false;
    } catch (err: unknown) {
      const errorMsg = typeof err === "string" ? err : "Erreur de connexion.";
      setAuthError(errorMsg);
      setAuthLoading(false);
      return false;
    }
  }, []);

  const registerAccount = useCallback(async (username: string, password: string, customUrl?: string): Promise<boolean> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = await invoke<AuthResponse>("auth_register", {
        username,
        password,
        customModsUrl: customUrl || null,
      });
      if (result.success && result.token && result.username) {
        setAuth({
          isLoggedIn: true,
          username: result.username,
          token: result.token,
        });
        localStorage.setItem("mc_auth_token", result.token);
        localStorage.setItem("mc_auth_username", result.username);
        setAuthLoading(false);
        return true;
      }
      setAuthError("Réponse inattendue du serveur.");
      setAuthLoading(false);
      return false;
    } catch (err: unknown) {
      const errorMsg = typeof err === "string" ? err : "Erreur d'inscription.";
      setAuthError(errorMsg);
      setAuthLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setAuth({ isLoggedIn: false, username: null, token: null });
    localStorage.removeItem("mc_auth_token");
    localStorage.removeItem("mc_auth_username");
    setAuthError(null);
  }, []);

  useEffect(() => {
    const savedModsUrl = localStorage.getItem("mc_mods_url") || undefined;
    const savedGameDir = localStorage.getItem("mc_game_dir") || undefined;
    loadConfig(savedModsUrl, savedGameDir);

    // Verify existing token on startup
    const savedToken = localStorage.getItem("mc_auth_token");
    if (savedToken) {
      verifyToken(savedToken, savedModsUrl).finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }

    // Écouter les événements de progression de synchronisation
    const unlistenSyncPromise = listen<SyncStatusPayload>("sync-status", (event) => {
      setStatus(event.payload);
    });

    // Écouter les événements de lancement Minecraft
    const unlistenLaunchPromise = listen<LaunchStatusPayload>("launch-status", (event) => {
      setLaunchStatus(event.payload);
      if (event.payload.step === "running") {
        setIsGameRunning(true);
      }
    });

    return () => {
      unlistenSyncPromise.then((u) => u());
      unlistenLaunchPromise.then((u) => u());
    };
  }, [loadConfig, verifyToken]);

  // Démarrer la synchronisation complète
  const startSync = useCallback(
    async (customUrl?: string, customDir?: string): Promise<boolean> => {
      if (isRunning || isLaunching) return false;

      setIsRunning(true);
      setError(null);
      setSummary(null);
      setStatus({
        step: "manifest",
        message: "Démarrage de la vérification...",
        current_file: null,
        current_index: 0,
        total_files: 0,
        file_progress: 0,
        total_progress: 0,
      });

      try {
        const res = await invoke<SyncSummary>("start_synchronization", {
          customModsUrl: customUrl || null,
          customGameDir: customDir || null,
        });
        setSummary(res);
        setIsRunning(false);
        return true;
      } catch (err: unknown) {
        const errorMsg = typeof err === "string" ? err : JSON.stringify(err);
        setError(errorMsg);
        setStatus((prev) => ({
          ...prev,
          step: "error",
          message: `Erreur : ${errorMsg}`,
        }));
        setIsRunning(false);
        return false;
      }
    },
    [isRunning, isLaunching]
  );

  // Lancer le jeu Minecraft 1.21.1 NeoForge (avec auth token)
  const launchMinecraft = useCallback(
    async (ramMb: number, customGameDir?: string, customModsUrl?: string) => {
      if (isLaunching) return;
      if (!auth.isLoggedIn || !auth.token || !auth.username) {
        setError("Vous devez être connecté pour lancer le jeu.");
        return;
      }

      setIsLaunching(true);
      setError(null);
      setLaunchStatus({
        step: "preparing",
        message: "Préparation du lancement...",
        progress: 5,
      });

      try {
        const result = await invoke<string>("launch_minecraft", {
          payload: {
            username: auth.username,
            ramMb,
            customGameDir: customGameDir || null,
            customModsUrl: customModsUrl || null,
            authToken: auth.token,
          },
        });
        console.log("Minecraft lancé :", result);
      } catch (err: unknown) {
        const errorMsg = typeof err === "string" ? err : JSON.stringify(err);
        setError(errorMsg);
        setLaunchStatus({
          step: "error",
          message: `Erreur de lancement : ${errorMsg}`,
          progress: 0,
        });
        setIsGameRunning(false);

        // Si le token a été invalidé ou rejeté côté serveur, déconnecter pour réinviter l'utilisateur
        if (
          errorMsg.toLowerCase().includes("invalide") ||
          errorMsg.toLowerCase().includes("expiré") ||
          errorMsg.toLowerCase().includes("connecté")
        ) {
          setAuth({ isLoggedIn: false, username: null, token: null });
          localStorage.removeItem("mc_auth_token");
          localStorage.removeItem("mc_auth_username");
        }
      } finally {
        setIsLaunching(false);
      }
    },
    [isLaunching, auth]
  );

  return {
    config,
    loadConfig,
    status,
    launchStatus,
    isRunning,
    isLaunching,
    isGameRunning,
    error,
    summary,
    startSync,
    launchMinecraft,
    // Auth
    auth,
    authLoading,
    authError,
    loginAccount,
    registerAccount,
    verifyToken,
    logout,
    setAuthError,
  };
}
