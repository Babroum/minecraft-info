use directories::BaseDirs;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

pub const DEFAULT_DIR_NAME: &str = ".serveur-info";
pub const DEFAULT_MODS_URL: &str = "http://localhost:8080";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModpackManifest {
    pub name: String,
    pub version: String,
    pub minecraft: MinecraftMeta,
    pub mods: Vec<ModEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MinecraftMeta {
    pub version: String,
    pub loader: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModEntry {
    pub file: String,
    pub sha256: String,
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LauncherConfig {
    pub mods_url: String,
    pub game_dir: String,
    pub mods_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncStatusPayload {
    pub step: String,
    pub message: String,
    pub current_file: Option<String>,
    pub current_index: usize,
    pub total_files: usize,
    pub file_progress: f64,
    pub total_progress: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncSummary {
    pub downloaded_count: usize,
    pub replaced_count: usize,
    pub deleted_count: usize,
    pub up_to_date_count: usize,
    pub total_mods: usize,
}

/// Résout l'emplacement du dossier du jeu (.serveur-info)
/// 1. Paramètre explicite
/// 2. Variable d'environnement `LAUNCHER_GAME_DIR`
/// 3. Dossier %APPDATA%/.serveur-info (Windows) ou ~/.serveur-info (Linux/macOS)
pub fn resolve_game_dir(custom_dir: Option<String>) -> PathBuf {
    if let Some(dir) = custom_dir {
        if !dir.trim().is_empty() {
            return PathBuf::from(dir);
        }
    }

    if let Ok(env_dir) = env::var("LAUNCHER_GAME_DIR") {
        if !env_dir.trim().is_empty() {
            return PathBuf::from(env_dir);
        }
    }

    if let Some(base_dirs) = BaseDirs::new() {
        base_dirs.data_dir().join(DEFAULT_DIR_NAME)
    } else {
        PathBuf::from(".").join(DEFAULT_DIR_NAME)
    }
}

/// Résout l'URL de base pour télécharger le manifest et les mods
/// 1. Paramètre explicite
/// 2. Variable d'environnement `LAUNCHER_MODS_URL`
/// 3. Valeur par défaut
pub fn resolve_mods_url(custom_url: Option<String>) -> String {
    if let Some(url) = custom_url {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            return trimmed.trim_end_matches('/').to_string();
        }
    }

    if let Ok(env_url) = env::var("LAUNCHER_MODS_URL") {
        let trimmed = env_url.trim();
        if !trimmed.is_empty() {
            return trimmed.trim_end_matches('/').to_string();
        }
    }

    DEFAULT_MODS_URL.to_string()
}

pub fn get_config(custom_url: Option<String>, custom_dir: Option<String>) -> LauncherConfig {
    let mods_url = resolve_mods_url(custom_url);
    let game_dir_buf = resolve_game_dir(custom_dir);
    let mods_dir_buf = game_dir_buf.join("mods");

    LauncherConfig {
        mods_url,
        game_dir: game_dir_buf.to_string_lossy().to_string(),
        mods_dir: mods_dir_buf.to_string_lossy().to_string(),
    }
}

/// Calcule le SHA-256 hexadécimal d'un fichier local
pub fn compute_file_sha256(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| format!("Impossible d'ouvrir {:?}: {}", path, e))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];

    loop {
        let n = file
            .read(&mut buffer)
            .map_err(|e| format!("Erreur de lecture {:?}: {}", path, e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

fn emit_status(app: &AppHandle, payload: SyncStatusPayload) {
    let _ = app.emit("sync-status", payload);
}

/// Exécute l'intégralité du cycle de synchronisation demandé
pub async fn execute_sync(
    app: AppHandle,
    custom_mods_url: Option<String>,
    custom_game_dir: Option<String>,
) -> Result<SyncSummary, String> {
    let client = Client::builder()
        .user_agent("ServerLauncher/0.1.0")
        .build()
        .map_err(|e| format!("Erreur initialisation client HTTP: {}", e))?;

    let config = get_config(custom_mods_url, custom_game_dir);
    let mods_path = PathBuf::from(&config.mods_dir);

    // Assurer l'existence des répertoires locaux
    fs::create_dir_all(&mods_path)
        .map_err(|e| format!("Impossible de créer le dossier {:?}: {}", mods_path, e))?;

    // ----------------------------------------------------
    // Étape 1 : Lire manifest distant
    // ----------------------------------------------------
    emit_status(
        &app,
        SyncStatusPayload {
            step: "manifest".to_string(),
            message: format!("Téléchargement du manifest depuis {}...", config.mods_url),
            current_file: None,
            current_index: 0,
            total_files: 0,
            file_progress: 0.0,
            total_progress: 5.0,
        },
    );

    let manifest_url = format!("{}/manifest.json", config.mods_url);
    let manifest_resp = client
        .get(&manifest_url)
        .send()
        .await
        .map_err(|e| format!("Impossible de récupérer le manifest distant ({}) : {}", manifest_url, e))?;

    if !manifest_resp.status().is_success() {
        return Err(format!(
            "Le serveur a répondu avec le statut HTTP {} pour {}",
            manifest_resp.status(),
            manifest_url
        ));
    }

    let manifest: ModpackManifest = manifest_resp
        .json()
        .await
        .map_err(|e| format!("Erreur lors du décodage du manifest JSON : {}", e))?;

    let total_remote_mods = manifest.mods.len();

    // ----------------------------------------------------
    // Étape 2 : Lire installation locale
    // ----------------------------------------------------
    emit_status(
        &app,
        SyncStatusPayload {
            step: "scanning".to_string(),
            message: format!("Analyse du dossier local {:?}...", mods_path),
            current_file: None,
            current_index: 0,
            total_files: total_remote_mods,
            file_progress: 0.0,
            total_progress: 10.0,
        },
    );

    let mut local_files: HashMap<String, PathBuf> = HashMap::new();
    if let Ok(entries) = fs::read_dir(&mods_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if !file_name.ends_with(".tmp") {
                        local_files.insert(file_name.to_string(), path.clone());
                    }
                }
            }
        }
    }

    // ----------------------------------------------------
    // Étape 3 : Comparer les fichiers
    // ----------------------------------------------------
    emit_status(
        &app,
        SyncStatusPayload {
            step: "comparing".to_string(),
            message: "Comparaison des fichiers et vérification d'intégrité...".to_string(),
            current_file: None,
            current_index: 0,
            total_files: total_remote_mods,
            file_progress: 0.0,
            total_progress: 15.0,
        },
    );

    let mut remote_file_names = HashSet::new();
    let mut files_to_download: Vec<ModEntry> = Vec::new();
    let mut up_to_date_count = 0;

    for (index, mod_entry) in manifest.mods.iter().enumerate() {
        remote_file_names.insert(mod_entry.file.clone());

        let file_path = mods_path.join(&mod_entry.file);
        if !file_path.exists() {
            // Fichier manquant
            files_to_download.push(mod_entry.clone());
        } else {
            // Fichier existant -> vérifier le hash SHA-256
            emit_status(
                &app,
                SyncStatusPayload {
                    step: "verifying".to_string(),
                    message: format!("Vérification SHA-256 de {}...", mod_entry.file),
                    current_file: Some(mod_entry.file.clone()),
                    current_index: index + 1,
                    total_files: total_remote_mods,
                    file_progress: 50.0,
                    total_progress: 15.0 + (index as f64 / total_remote_mods as f64) * 15.0,
                },
            );

            match compute_file_sha256(&file_path) {
                Ok(local_hash) => {
                    if local_hash.eq_ignore_ascii_case(&mod_entry.sha256) {
                        up_to_date_count += 1;
                    } else {
                        // Fichier incorrect -> à re-télécharger et remplacer
                        files_to_download.push(mod_entry.clone());
                    }
                }
                Err(_) => {
                    files_to_download.push(mod_entry.clone());
                }
            }
        }
    }

    // Fichiers orphelins à supprimer (présents localement mais non listés dans le manifest)
    let mut files_to_delete: Vec<PathBuf> = Vec::new();
    for (local_file_name, path) in &local_files {
        if !remote_file_names.contains(local_file_name) {
            files_to_delete.push(path.clone());
        }
    }

    // ----------------------------------------------------
    // Étape 4, 5 & 6 : Télécharger, Vérifier SHA-256, Remplacer
    // ----------------------------------------------------
    let download_total = files_to_download.len();
    let mut downloaded_count = 0;
    let mut replaced_count = 0;

    for (idx, mod_entry) in files_to_download.iter().enumerate() {
        let file_url = mod_entry
            .url
            .clone()
            .unwrap_or_else(|| format!("{}/mods/{}", config.mods_url, mod_entry.file));

        let tmp_file_path = mods_path.join(format!("{}.tmp", mod_entry.file));
        let final_file_path = mods_path.join(&mod_entry.file);
        let is_replacement = final_file_path.exists();

        // 4. Téléchargement vers un fichier temporaire .tmp
        emit_status(
            &app,
            SyncStatusPayload {
                step: "downloading".to_string(),
                message: format!("Téléchargement de {} ({}/{})", mod_entry.file, idx + 1, download_total),
                current_file: Some(mod_entry.file.clone()),
                current_index: idx + 1,
                total_files: download_total,
                file_progress: 0.0,
                total_progress: 30.0 + ((idx as f64) / (download_total as f64).max(1.0)) * 55.0,
            },
        );

        let mut res = client
            .get(&file_url)
            .send()
            .await
            .map_err(|e| format!("Échec du téléchargement pour {} : {}", file_url, e))?;

        if !res.status().is_success() {
            return Err(format!(
                "Erreur HTTP {} lors du téléchargement de {}",
                res.status(),
                file_url
            ));
        }

        let total_size = res.content_length().unwrap_or(0);
        let mut downloaded_bytes: u64 = 0;
        let mut tmp_file = File::create(&tmp_file_path)
            .map_err(|e| format!("Impossible de créer {:?} : {}", tmp_file_path, e))?;

        while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
            tmp_file
                .write_all(&chunk)
                .map_err(|e| format!("Erreur d'écriture dans {:?} : {}", tmp_file_path, e))?;
            downloaded_bytes += chunk.len() as u64;

            let file_pct = if total_size > 0 {
                (downloaded_bytes as f64 / total_size as f64) * 100.0
            } else {
                50.0
            };

            emit_status(
                &app,
                SyncStatusPayload {
                    step: "downloading".to_string(),
                    message: format!(
                        "Téléchargement de {} ({:.1} Mo)",
                        mod_entry.file,
                        downloaded_bytes as f64 / (1024.0 * 1024.0)
                    ),
                    current_file: Some(mod_entry.file.clone()),
                    current_index: idx + 1,
                    total_files: download_total,
                    file_progress: file_pct,
                    total_progress: 30.0
                        + (((idx as f64) + (file_pct / 100.0)) / (download_total as f64).max(1.0)) * 55.0,
                },
            );
        }

        tmp_file.flush().map_err(|e| e.to_string())?;
        drop(tmp_file);

        // 5. Vérifier SHA-256
        emit_status(
            &app,
            SyncStatusPayload {
                step: "verifying".to_string(),
                message: format!("Vérification SHA-256 de {}...", mod_entry.file),
                current_file: Some(mod_entry.file.clone()),
                current_index: idx + 1,
                total_files: download_total,
                file_progress: 95.0,
                total_progress: 30.0 + (((idx as f64) + 0.95) / (download_total as f64).max(1.0)) * 55.0,
            },
        );

        let computed_hash = compute_file_sha256(&tmp_file_path)?;
        if !computed_hash.eq_ignore_ascii_case(&mod_entry.sha256) {
            let _ = fs::remove_file(&tmp_file_path);
            return Err(format!(
                "Intégrité invalide pour {} ! SHA-256 attendu: {}, obtenu: {}",
                mod_entry.file, mod_entry.sha256, computed_hash
            ));
        }

        // 6. Remplacer les fichiers incorrects / finaliser
        emit_status(
            &app,
            SyncStatusPayload {
                step: "replacing".to_string(),
                message: format!("Installation de {}...", mod_entry.file),
                current_file: Some(mod_entry.file.clone()),
                current_index: idx + 1,
                total_files: download_total,
                file_progress: 100.0,
                total_progress: 30.0 + (((idx as f64) + 1.0) / (download_total as f64).max(1.0)) * 55.0,
            },
        );

        // Renommage atomique du .tmp vers le nom définitif
        fs::rename(&tmp_file_path, &final_file_path).map_err(|e| {
            format!(
                "Impossible de déplacer {:?} vers {:?} : {}",
                tmp_file_path, final_file_path, e
            )
        })?;

        if is_replacement {
            replaced_count += 1;
        } else {
            downloaded_count += 1;
        }
    }

    // ----------------------------------------------------
    // Étape 7 : Supprimer les anciens fichiers
    // ----------------------------------------------------
    let deleted_count = files_to_delete.len();
    if deleted_count > 0 {
        emit_status(
            &app,
            SyncStatusPayload {
                step: "cleaning".to_string(),
                message: format!("Suppression de {} anciens fichiers orphelins...", deleted_count),
                current_file: None,
                current_index: 0,
                total_files: deleted_count,
                file_progress: 50.0,
                total_progress: 90.0,
            },
        );

        for obsolete_file in files_to_delete {
            let _ = fs::remove_file(obsolete_file);
        }
    }

    // Nettoyage de résidus .tmp éventuels
    if let Ok(entries) = fs::read_dir(&mods_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "tmp" {
                    let _ = fs::remove_file(path);
                }
            }
        }
    }

    // ----------------------------------------------------
    // Terminé et Prêt !
    // ----------------------------------------------------
    emit_status(
        &app,
        SyncStatusPayload {
            step: "done".to_string(),
            message: "Tous les fichiers sont à jour et vérifiés ! Prêt à jouer.".to_string(),
            current_file: None,
            current_index: total_remote_mods,
            total_files: total_remote_mods,
            file_progress: 100.0,
            total_progress: 100.0,
        },
    );

    Ok(SyncSummary {
        downloaded_count,
        replaced_count,
        deleted_count,
        up_to_date_count,
        total_mods: total_remote_mods,
    })
}
