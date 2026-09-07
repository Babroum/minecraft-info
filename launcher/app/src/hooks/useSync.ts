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

  useEffect(() => {
    loadConfig();

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
  }, [loadConfig]);

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

  // Lancer le jeu Minecraft 1.21.1 NeoForge
  const launchMinecraft = useCallback(
    async (username: string, ramMb: number, customGameDir?: string) => {
      if (isLaunching) return;

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
            username,
            ramMb,
            customGameDir: customGameDir || null,
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
      } finally {
        setIsLaunching(false);
      }
    },
    [isLaunching]
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
  };
}
