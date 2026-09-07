use directories::BaseDirs;
use md5::{Digest, Md5};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

pub const VANILLA_VERSION: &str = "1.21.1";
#[allow(dead_code)]
pub const FABRIC_LOADER_VERSION: &str = "0.19.5";
pub const MOJANG_1_21_1_META_URL: &str =
    "https://piston-meta.mojang.com/v1/packages/ca98b8ed4ba12c176a1e75cb5a5555a90cfe0b6c/1.21.1.json";
pub const FABRIC_PROFILE_URL: &str =
    "https://meta.fabricmc.net/v2/versions/loader/1.21.1/0.19.5/profile/json";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LaunchPayload {
    pub username: String,
    pub ram_mb: Option<u32>,
    pub custom_game_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LaunchEventPayload {
    pub step: String,
    pub message: String,
    pub progress: f64,
}

#[derive(Debug, Deserialize)]
struct MojangVersionMeta {
    downloads: MojangDownloads,
    libraries: Vec<MojangLibrary>,
    #[serde(rename = "assetIndex")]
    asset_index: Option<MojangAssetIndex>,
}

#[derive(Debug, Deserialize)]
struct MojangDownloads {
    client: MojangDownloadArtifact,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct MojangDownloadArtifact {
    url: String,
    size: u64,
    #[serde(default)]
    path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MojangLibrary {
    name: String,
    #[serde(default)]
    downloads: Option<MojangLibraryDownloads>,
    #[serde(default)]
    rules: Option<Vec<MojangRule>>,
}

#[derive(Debug, Deserialize)]
struct MojangLibraryDownloads {
    artifact: Option<MojangDownloadArtifact>,
}

#[derive(Debug, Deserialize)]
struct MojangRule {
    action: String,
    #[serde(default)]
    os: Option<MojangOsRule>,
}

#[derive(Debug, Deserialize)]
struct MojangOsRule {
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct MojangAssetIndex {
    id: String,
    url: String,
}

#[derive(Debug, Deserialize)]
struct FabricProfileMeta {
    #[serde(rename = "mainClass")]
    main_class: String,
    libraries: Vec<FabricLibrary>,
}

#[derive(Debug, Deserialize)]
struct FabricLibrary {
    name: String,
    url: Option<String>,
}

fn emit_launch_event(app: &AppHandle, step: &str, message: &str, progress: f64) {
    let _ = app.emit(
        "launch-status",
        LaunchEventPayload {
            step: step.to_string(),
            message: message.to_string(),
            progress,
        },
    );
}

pub fn generate_offline_uuid(username: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(format!("OfflinePlayer:{}", username).as_bytes());
    let mut bytes = hasher.finalize();

    // RFC 4122 version 3 et variante
    bytes[6] = (bytes[6] & 0x0f) | 0x30;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6], bytes[7],
        bytes[8], bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}

fn maven_to_path(name: &str) -> String {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return name.to_string();
    }
    let group = parts[0].replace('.', "/");
    let artifact = parts[1];
    let version = parts[2];
    let classifier = if parts.len() >= 4 {
        format!("-{}", parts[3])
    } else {
        String::new()
    };

    format!(
        "{}/{}/{}/{}-{}{}.jar",
        group, artifact, version, artifact, version, classifier
    )
}

fn is_library_allowed(rules: &Option<Vec<MojangRule>>) -> bool {
    let rules = match rules {
        Some(r) => r,
        None => return true,
    };

    let mut allowed = false;
    for rule in rules {
        let matches_os = match &rule.os {
            Some(os) => os.name.as_deref() == Some("windows"),
            None => true,
        };

        if matches_os {
            allowed = rule.action == "allow";
        }
    }
    allowed
}

async fn download_file_if_missing(
    client: &Client,
    url: &str,
    target_path: &Path,
) -> Result<(), String> {
    if target_path.exists() {
        return Ok(());
    }

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Erreur téléchargement {}: {}", url, e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "HTTP {} lors du téléchargement de {}",
            resp.status(),
            url
        ));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let mut file = File::create(target_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn launch_minecraft_game(
    app: AppHandle,
    payload: LaunchPayload,
) -> Result<String, String> {
    let client = Client::builder()
        .user_agent("ServerLauncher/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let username = if payload.username.trim().is_empty() {
        "Player".to_string()
    } else {
        payload.username.trim().to_string()
    };
    let ram_mb = payload.ram_mb.unwrap_or(4096);

    // Résolution des dossiers
    let game_dir = crate::sync::resolve_game_dir(payload.custom_game_dir);
    let dot_minecraft = BaseDirs::new()
        .map(|b| b.data_dir().join(".minecraft"))
        .unwrap_or_else(|| PathBuf::from(".minecraft"));

    let local_libs_dir = game_dir.join("libraries");
    let mc_libs_dir = dot_minecraft.join("libraries");
    let versions_dir = game_dir.join("versions").join(VANILLA_VERSION);
    let logs_dir = game_dir.join("logs");

    fs::create_dir_all(&versions_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&local_libs_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;

    emit_launch_event(
        &app,
        "checking_vanilla",
        "Vérification du client Minecraft 1.21.1...",
        10.0,
    );

    // 1. Récupérer les métadonnées de Minecraft 1.21.1
    let vanilla_meta_path = versions_dir.join("1.21.1.json");
    let vanilla_meta: MojangVersionMeta = if vanilla_meta_path.exists() {
        let content = fs::read_to_string(&vanilla_meta_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        let resp = client
            .get(MOJANG_1_21_1_META_URL)
            .send()
            .await
            .map_err(|e| format!("Impossible de joindre Mojang: {}", e))?;
        let raw_text = resp.text().await.map_err(|e| e.to_string())?;
        let _ = fs::write(&vanilla_meta_path, &raw_text);
        serde_json::from_str(&raw_text).map_err(|e| e.to_string())?
    };

    // 2. Client Jar 1.21.1
    let client_jar_path = versions_dir.join("1.21.1.jar");
    let mc_client_jar = dot_minecraft
        .join("versions")
        .join(VANILLA_VERSION)
        .join("1.21.1.jar");

    if !client_jar_path.exists() {
        if mc_client_jar.exists() {
            let _ = fs::copy(&mc_client_jar, &client_jar_path);
        } else {
            emit_launch_event(
                &app,
                "downloading_client",
                "Téléchargement du client Minecraft 1.21.1 officiel (Mojang)...",
                20.0,
            );
            download_file_if_missing(&client, &vanilla_meta.downloads.client.url, &client_jar_path)
                .await?;
        }
    }

    // 3. Fabric Loader Profile
    emit_launch_event(
        &app,
        "checking_fabric",
        "Vérification du Fabric Loader 1.21.1...",
        35.0,
    );

    let fabric_resp = client
        .get(FABRIC_PROFILE_URL)
        .send()
        .await
        .map_err(|e| format!("Erreur Fabric meta API: {}", e))?;
    let fabric_meta: FabricProfileMeta = fabric_resp.json().await.map_err(|e| e.to_string())?;

    // 4. Téléchargement et assemblage des librairies pour le Classpath
    emit_launch_event(
        &app,
        "checking_libs",
        "Vérification des bibliothèques Minecraft & Fabric...",
        50.0,
    );

    let mut classpath_entries: Vec<PathBuf> = Vec::new();

    // A. Librairies Fabric
    for flib in &fabric_meta.libraries {
        let rel_path = maven_to_path(&flib.name);
        let in_game = local_libs_dir.join(&rel_path);
        let in_mc = mc_libs_dir.join(&rel_path);

        if in_game.exists() {
            classpath_entries.push(in_game);
        } else if in_mc.exists() {
            classpath_entries.push(in_mc);
        } else {
            let base_url = flib
                .url
                .as_deref()
                .unwrap_or("https://maven.fabricmc.net/");
            let full_url = format!("{}/{}", base_url.trim_end_matches('/'), rel_path);
            download_file_if_missing(&client, &full_url, &in_game).await?;
            classpath_entries.push(in_game);
        }
    }

    // B. Librairies Vanilla Mojang
    let total_vlibs = vanilla_meta.libraries.len();
    for (i, vlib) in vanilla_meta.libraries.iter().enumerate() {
        if !is_library_allowed(&vlib.rules) {
            continue;
        }

        if let Some(downloads) = &vlib.downloads {
            if let Some(artifact) = &downloads.artifact {
                let rel_path = artifact
                    .path
                    .clone()
                    .unwrap_or_else(|| maven_to_path(&vlib.name));
                let in_game = local_libs_dir.join(&rel_path);
                let in_mc = mc_libs_dir.join(&rel_path);

                if in_game.exists() {
                    classpath_entries.push(in_game);
                } else if in_mc.exists() {
                    classpath_entries.push(in_mc);
                } else {
                    emit_launch_event(
                        &app,
                        "downloading_libs",
                        &format!("Téléchargement de {} ({}/{})", vlib.name, i + 1, total_vlibs),
                        50.0 + ((i as f64) / (total_vlibs as f64)) * 35.0,
                    );
                    download_file_if_missing(&client, &artifact.url, &in_game).await?;
                    classpath_entries.push(in_game);
                }
            }
        }
    }

    // C. Ajouter le client jar 1.21.1 en fin de classpath
    classpath_entries.push(client_jar_path);

    // 5. Assets directory
    let assets_dir = if dot_minecraft.join("assets").exists() {
        dot_minecraft.join("assets")
    } else {
        game_dir.join("assets")
    };

    // Assurer l'index d'assets
    let asset_index = vanilla_meta
        .asset_index
        .as_ref()
        .map(|a| a.id.clone())
        .unwrap_or_else(|| "17".to_string());

    let classpath_separator = if cfg!(windows) { ";" } else { ":" };
    let classpath = classpath_entries
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<String>>()
        .join(classpath_separator);

    let uuid = generate_offline_uuid(&username);

    // 6. Lancement du processus Java
    emit_launch_event(
        &app,
        "spawning",
        &format!("Démarrage de Minecraft pour {} (RAM: {} Mo)...", username, ram_mb),
        95.0,
    );

    let log_file_path = logs_dir.join("latest-game.log");
    let log_file = File::create(&log_file_path).map_err(|e| e.to_string())?;

    let mut cmd = Command::new("java");

    // Fixer explicitement le répertoire de travail pour que Minecraft et les mods écrivent dans .serveur-info
    cmd.current_dir(&game_dir);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        cmd.creation_flags(CREATE_NEW_PROCESS_GROUP);
    }

    cmd.arg(format!("-Xmx{}M", ram_mb))
        .arg("-Xms1024M")
        .arg("-DFabricMcEmu= net.minecraft.client.main.Main ")
        .arg("-cp")
        .arg(&classpath)
        .arg(&fabric_meta.main_class)
        .arg("--username")
        .arg(&username)
        .arg("--version")
        .arg(VANILLA_VERSION)
        .arg("--gameDir")
        .arg(&game_dir)
        .arg("--assetsDir")
        .arg(&assets_dir)
        .arg("--assetIndex")
        .arg(&asset_index)
        .arg("--uuid")
        .arg(&uuid)
        .arg("--accessToken")
        .arg("0");

    // Redirection des logs du jeu vers latest-game.log
    cmd.stdout(Stdio::from(log_file.try_clone().map_err(|e| e.to_string())?));
    cmd.stderr(Stdio::from(log_file));

    let child = cmd.spawn().map_err(|e| {
        format!(
            "Échec du lancement de java: {}. Assurez-vous que Java 21+ est installé.",
            e
        )
    })?;

    let pid = child.id();

    emit_launch_event(
        &app,
        "running",
        &format!("Minecraft 1.21.1 Fabric est lancé avec succès ! (PID: {})", pid),
        100.0,
    );

    Ok(format!("Minecraft lancé avec succès (PID: {})", pid))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_offline_uuid_format() {
        let uuid = generate_offline_uuid("Croksie");
        assert_eq!(uuid.len(), 36);
        let parts: Vec<&str> = uuid.split('-').collect();
        assert_eq!(parts.len(), 5);
        assert_eq!(parts[0].len(), 8);
        assert_eq!(parts[1].len(), 4);
        assert_eq!(parts[2].len(), 4);
        assert_eq!(parts[3].len(), 4);
        assert_eq!(parts[4].len(), 12);
    }

    #[test]
    fn test_maven_to_path() {
        let path = maven_to_path("net.fabricmc:fabric-loader:0.19.5");
        assert_eq!(path, "net/fabricmc/fabric-loader/0.19.5/fabric-loader-0.19.5.jar");
    }
}
