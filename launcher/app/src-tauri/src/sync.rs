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
    #[serde(default)]
    pub mods: Vec<ModEntry>,
    #[serde(default)]
    pub resourcepacks: Vec<ModEntry>,
    #[serde(default)]
    pub datapacks: Vec<ModEntry>,
    #[serde(default)]
    pub kubejs: Vec<ModEntry>,
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

/// S'assure qu'un pack de ressources est activé dans options.txt du client
pub fn ensure_resource_pack_enabled(game_dir: &Path, pack_filename: &str) {
    let options_file = game_dir.join("options.txt");
    let pack_entry = format!("\"file/{}\"", pack_filename);

    let content = if options_file.exists() {
        fs::read_to_string(&options_file).unwrap_or_default()
    } else {
        String::new()
    };

    let mut found = false;
    let mut new_lines = Vec::new();

    for line in content.lines() {
        if line.starts_with("resourcePacks:") {
            found = true;
            if !line.contains(&pack_entry) {
                if let Some(idx) = line.rfind(']') {
                    let prefix = &line[..idx];
                    let suffix = &line[idx..];
                    if prefix.trim().ends_with('[') {
                        new_lines.push(format!("resourcePacks:[{}{}]", pack_entry, suffix));
                    } else {
                        new_lines.push(format!("resourcePacks:[{},{}{}]", &prefix[14..], pack_entry, suffix));
                    }
                } else {
                    new_lines.push(format!("resourcePacks:[\"vanilla\",{}]", pack_entry));
                }
            } else {
                new_lines.push(line.to_string());
            }
        } else {
            new_lines.push(line.to_string());
        }
    }

    if !found {
        new_lines.push(format!("resourcePacks:[\"vanilla\",{}]", pack_entry));
        new_lines.push("incompatibleResourcePacks:[]".to_string());
    }

    let _ = fs::write(&options_file, new_lines.join("\n") + "\n");
}

struct SyncCategory<'a> {
    name: &'a str,
    label: &'a str,
    target_dir: PathBuf,
    endpoint: &'a str,
    entries: &'a [ModEntry],
    clean_orphans: bool,
}

fn scan_local_files_recursive(base_dir: &Path, current_rel: &Path, map: &mut HashMap<String, PathBuf>) {
    let current_dir = base_dir.join(current_rel);
    if let Ok(entries) = fs::read_dir(current_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_local_files_recursive(base_dir, &current_rel.join(entry.file_name()), map);
            } else if path.is_file() {
                if let Ok(rel) = path.strip_prefix(base_dir) {
                    let file_name = rel.to_string_lossy().replace('\\', "/");
                    if !file_name.ends_with(".tmp") {
                        map.insert(file_name, path);
                    }
                }
            }
        }
    }
}

fn clean_tmp_files_recursive(dir: &Path) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                clean_tmp_files_recursive(&p);
            } else if p.is_file() {
                if let Some(ext) = p.extension() {
                    if ext == "tmp" {
                        let _ = fs::remove_file(p);
                    }
                }
            }
        }
    }
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
    let game_dir_buf = PathBuf::from(&config.game_dir);

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

    let categories = [
        SyncCategory {
            name: "mods",
            label: "mods",
            target_dir: game_dir_buf.join("mods"),
            endpoint: "mods",
            entries: &manifest.mods,
            clean_orphans: true,
        },
        SyncCategory {
            name: "resourcepacks",
            label: "packs de ressources",
            target_dir: game_dir_buf.join("resourcepacks"),
            endpoint: "resourcepacks",
            entries: &manifest.resourcepacks,
            clean_orphans: false,
        },
        SyncCategory {
            name: "datapacks",
            label: "datapacks",
            target_dir: game_dir_buf.join("datapacks"),
            endpoint: "datapacks",
            entries: &manifest.datapacks,
            clean_orphans: false,
        },
        SyncCategory {
            name: "kubejs",
            label: "scripts & textures KubeJS",
            target_dir: game_dir_buf.join("kubejs"),
            endpoint: "kubejs",
            entries: &manifest.kubejs,
            clean_orphans: true,
        },
    ];

    let total_remote_items: usize = categories.iter().map(|c| c.entries.len()).sum();
    let mut downloaded_count = 0;
    let mut replaced_count = 0;
    let mut deleted_count = 0;
    let mut up_to_date_count = 0;
    let mut processed_global = 0;

    for cat in &categories {
        if cat.entries.is_empty() && !cat.clean_orphans {
            continue;
        }

        fs::create_dir_all(&cat.target_dir)
            .map_err(|e| format!("Impossible de créer le dossier {:?}: {}", cat.target_dir, e))?;

        emit_status(
            &app,
            SyncStatusPayload {
                step: "scanning".to_string(),
                message: format!("Analyse du dossier {}...", cat.label),
                current_file: None,
                current_index: processed_global,
                total_files: total_remote_items,
                file_progress: 0.0,
                total_progress: 10.0 + (processed_global as f64 / total_remote_items.max(1) as f64) * 10.0,
            },
        );

        let mut local_files: HashMap<String, PathBuf> = HashMap::new();
        scan_local_files_recursive(&cat.target_dir, Path::new(""), &mut local_files);

        let mut remote_file_names = HashSet::new();
        let mut files_to_download: Vec<ModEntry> = Vec::new();

        for entry in cat.entries {
            remote_file_names.insert(entry.file.clone());
            let file_path = cat.target_dir.join(&entry.file);

            if !file_path.exists() {
                files_to_download.push((*entry).clone());
            } else {
                emit_status(
                    &app,
                    SyncStatusPayload {
                        step: "verifying".to_string(),
                        message: format!("Vérification SHA-256 de {}...", entry.file),
                        current_file: Some(entry.file.clone()),
                        current_index: processed_global + 1,
                        total_files: total_remote_items,
                        file_progress: 50.0,
                        total_progress: 20.0 + (processed_global as f64 / total_remote_items.max(1) as f64) * 15.0,
                    },
                );

                match compute_file_sha256(&file_path) {
                    Ok(local_hash) => {
                        if local_hash.eq_ignore_ascii_case(&entry.sha256) {
                            up_to_date_count += 1;
                        } else {
                            files_to_download.push((*entry).clone());
                        }
                    }
                    Err(_) => {
                        files_to_download.push((*entry).clone());
                    }
                }
            }
            processed_global += 1;
        }

        if cat.clean_orphans {
            let mut files_to_delete: Vec<PathBuf> = Vec::new();
            for (local_file_name, path) in &local_files {
                if !remote_file_names.contains(local_file_name) {
                    files_to_delete.push(path.clone());
                }
            }

            let cat_deleted = files_to_delete.len();
            if cat_deleted > 0 {
                deleted_count += cat_deleted;
                emit_status(
                    &app,
                    SyncStatusPayload {
                        step: "cleaning".to_string(),
                        message: format!("Suppression de {} anciens fichiers dans {}...", cat_deleted, cat.label),
                        current_file: None,
                        current_index: processed_global,
                        total_files: total_remote_items,
                        file_progress: 50.0,
                        total_progress: 35.0,
                    },
                );

                for obsolete_file in files_to_delete {
                    let _ = fs::remove_file(obsolete_file);
                }
            }
        }

        let download_total = files_to_download.len();
        for (idx, entry) in files_to_download.iter().enumerate() {
            let file_url = entry
                .url
                .clone()
                .unwrap_or_else(|| format!("{}/{}/{}", config.mods_url, cat.endpoint, entry.file));

            let tmp_file_path = cat.target_dir.join(format!("{}.tmp", entry.file));
            let final_file_path = cat.target_dir.join(&entry.file);
            let is_replacement = final_file_path.exists();

            if let Some(parent) = tmp_file_path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            if let Some(parent) = final_file_path.parent() {
                let _ = fs::create_dir_all(parent);
            }

            emit_status(
                &app,
                SyncStatusPayload {
                    step: "downloading".to_string(),
                    message: format!("Téléchargement de {} ({}/{})", entry.file, idx + 1, download_total),
                    current_file: Some(entry.file.clone()),
                    current_index: idx + 1,
                    total_files: download_total,
                    file_progress: 0.0,
                    total_progress: 35.0 + ((idx as f64) / download_total.max(1) as f64) * 55.0,
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
                            entry.file,
                            downloaded_bytes as f64 / (1024.0 * 1024.0)
                        ),
                        current_file: Some(entry.file.clone()),
                        current_index: idx + 1,
                        total_files: download_total,
                        file_progress: file_pct,
                        total_progress: 35.0
                            + (((idx as f64) + (file_pct / 100.0)) / download_total.max(1) as f64) * 55.0,
                    },
                );
            }

            tmp_file.flush().map_err(|e| e.to_string())?;
            drop(tmp_file);

            // Vérification SHA-256
            emit_status(
                &app,
                SyncStatusPayload {
                    step: "verifying".to_string(),
                    message: format!("Vérification SHA-256 de {}...", entry.file),
                    current_file: Some(entry.file.clone()),
                    current_index: idx + 1,
                    total_files: download_total,
                    file_progress: 95.0,
                    total_progress: 35.0 + (((idx as f64) + 0.95) / download_total.max(1) as f64) * 55.0,
                },
            );

            let computed_hash = compute_file_sha256(&tmp_file_path)?;
            if !computed_hash.eq_ignore_ascii_case(&entry.sha256) {
                let _ = fs::remove_file(&tmp_file_path);
                return Err(format!(
                    "Intégrité invalide pour {} ! SHA-256 attendu: {}, obtenu: {}",
                    entry.file, entry.sha256, computed_hash
                ));
            }

            // Déplacement vers le nom final
            emit_status(
                &app,
                SyncStatusPayload {
                    step: "replacing".to_string(),
                    message: format!("Installation de {}...", entry.file),
                    current_file: Some(entry.file.clone()),
                    current_index: idx + 1,
                    total_files: download_total,
                    file_progress: 100.0,
                    total_progress: 35.0 + (((idx as f64) + 1.0) / download_total.max(1) as f64) * 55.0,
                },
            );

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

        // Nettoyer d'éventuels .tmp résiduels
        clean_tmp_files_recursive(&cat.target_dir);

        // Si pack de ressources : s'assurer qu'il est activé dans options.txt
        if cat.name == "resourcepacks" {
            for entry in cat.entries {
                ensure_resource_pack_enabled(&game_dir_buf, &entry.file);
            }
        }
    }

    emit_status(
        &app,
        SyncStatusPayload {
            step: "done".to_string(),
            message: "Tous les fichiers sont à jour et vérifiés ! Prêt à jouer.".to_string(),
            current_file: None,
            current_index: total_remote_items,
            total_files: total_remote_items,
            file_progress: 100.0,
            total_progress: 100.0,
        },
    );

    Ok(SyncSummary {
        downloaded_count,
        replaced_count,
        deleted_count,
        up_to_date_count,
        total_mods: total_remote_items,
    })
}
