use directories::BaseDirs;
use md5::{Digest, Md5};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

pub const VANILLA_VERSION: &str = "1.21.1";
pub const NEOFORGE_VERSION: &str = "21.1.250";
pub const FML_VERSION: &str = "4.0.44";
pub const NEOFORM_VERSION: &str = "20240808.144430";

pub const MOJANG_1_21_1_META_URL: &str =
    "https://piston-meta.mojang.com/v1/packages/ca98b8ed4ba12c176a1e75cb5a5555a90cfe0b6c/1.21.1.json";
pub const NEOFORGE_INSTALLER_URL: &str =
    "https://maven.neoforged.net/releases/net/neoforged/neoforge/21.1.250/neoforge-21.1.250-installer.jar";

const NEOFORGE_MODULE_JARS: &[&str] = &[
    "cpw/mods/bootstraplauncher/2.0.2/bootstraplauncher-2.0.2.jar",
    "cpw/mods/securejarhandler/3.0.8/securejarhandler-3.0.8.jar",
    "org/ow2/asm/asm-commons/9.10.1/asm-commons-9.10.1.jar",
    "org/ow2/asm/asm-util/9.10.1/asm-util-9.10.1.jar",
    "org/ow2/asm/asm-analysis/9.10.1/asm-analysis-9.10.1.jar",
    "org/ow2/asm/asm-tree/9.10.1/asm-tree-9.10.1.jar",
    "org/ow2/asm/asm/9.10.1/asm-9.10.1.jar",
    "net/neoforged/JarJarFileSystems/0.4.1/JarJarFileSystems-0.4.1.jar",
];

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
struct NeoForgeProfileMeta {
    #[serde(default)]
    libraries: Vec<NeoForgeLibrary>,
}

#[derive(Debug, Deserialize)]
struct NeoForgeLibrary {
    #[allow(dead_code)]
    name: String,
    #[serde(default)]
    downloads: Option<NeoForgeLibraryDownloads>,
}

#[derive(Debug, Deserialize)]
struct NeoForgeLibraryDownloads {
    artifact: Option<NeoForgeArtifact>,
}

#[derive(Debug, Deserialize)]
struct NeoForgeArtifact {
    path: String,
    url: String,
}

#[derive(Debug, Deserialize)]
struct AssetIndexFile {
    objects: std::collections::HashMap<String, AssetObject>,
}

#[derive(Debug, Deserialize)]
struct AssetObject {
    hash: String,
    #[allow(dead_code)]
    #[serde(default)]
    size: u64,
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

pub fn maven_to_path(name: &str) -> String {
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
    format!("{}/{}/{}/{}-{}{}.jar", group, artifact, version, artifact, version, classifier)
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

    // 1. Récupérer les métadonnées Vanilla de Minecraft 1.21.1
    let vanilla_meta_path = versions_dir.join("1.21.1.json");
    let vanilla_meta: MojangVersionMeta = if vanilla_meta_path.exists() {
        let content = fs::read_to_string(&vanilla_meta_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        let resp = client
            .get(MOJANG_1_21_1_META_URL)
            .send()
            .await
            .map_err(|e| format!("Erreur Mojang meta API: {}", e))?;
        let content = resp.text().await.map_err(|e| e.to_string())?;
        let meta: MojangVersionMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        fs::write(&vanilla_meta_path, &content).map_err(|e| e.to_string())?;
        meta
    };

    // 2. Client JAR Minecraft officiel 1.21.1
    let client_jar_path = versions_dir.join("1.21.1.jar");
    if !client_jar_path.exists() {
        let mc_client_jar = dot_minecraft
            .join("versions")
            .join(VANILLA_VERSION)
            .join(format!("{}.jar", VANILLA_VERSION));

        if mc_client_jar.exists() {
            fs::copy(&mc_client_jar, &client_jar_path).map_err(|e| e.to_string())?;
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

    // 3. Profil NeoForge 21.1.250
    emit_launch_event(
        &app,
        "checking_neoforge",
        "Vérification du profil NeoForge 21.1.250...",
        35.0,
    );

    const EMBEDDED_NEOFORGE_JSON: &str = include_str!("../neoforge-21.1.250.json");
    let neoforge_meta: NeoForgeProfileMeta =
        serde_json::from_str(EMBEDDED_NEOFORGE_JSON).map_err(|e| e.to_string())?;

    // 4. Vérifier si le binaire client patché NeoForge existe
    let client_rel_path = format!("net/neoforged/neoforge/{}/neoforge-{}-client.jar", NEOFORGE_VERSION, NEOFORGE_VERSION);
    let patched_client_mc = mc_libs_dir.join(&client_rel_path);
    let patched_client_local = local_libs_dir.join(&client_rel_path);

    if !patched_client_mc.exists() && !patched_client_local.exists() {
        emit_launch_event(
            &app,
            "installing_neoforge",
            "Installation initiale de NeoForge 21.1.250...",
            40.0,
        );

        // Assurer que launcher_profiles.json existe pour l'installeur
        let launcher_profiles = dot_minecraft.join("launcher_profiles.json");
        if !launcher_profiles.exists() {
            let _ = fs::create_dir_all(&dot_minecraft);
            let _ = fs::write(&launcher_profiles, "{\"profiles\":{}}");
        }

        let installer_path = versions_dir.join(format!("neoforge-{}-installer.jar", NEOFORGE_VERSION));
        download_file_if_missing(&client, NEOFORGE_INSTALLER_URL, &installer_path).await?;

        // Exécuter l'installation client de NeoForge
        let install_status = Command::new("java")
            .arg("-jar")
            .arg(&installer_path)
            .arg("--installClient")
            .arg(&dot_minecraft)
            .status()
            .map_err(|e| format!("Erreur lors de l'exécution de l'installeur NeoForge: {}", e))?;

        if !install_status.success() {
            return Err("Échec de l'installation de NeoForge. Vérifiez que Java 21+ est installé.".to_string());
        }
    }

    // 5. Téléchargement et assemblage des librairies NeoForge et Mojang
    emit_launch_event(
        &app,
        "checking_libs",
        "Vérification des bibliothèques Minecraft & NeoForge...",
        55.0,
    );

    // Déterminer le dossier principal des bibliothèques (mc_libs_dir par défaut pour partager avec Vanilla)
    let primary_libs_dir = if mc_libs_dir.exists() {
        &mc_libs_dir
    } else {
        &local_libs_dir
    };

    // A. Modules pour le ModulePath (-p)
    let mut module_entries: Vec<PathBuf> = Vec::new();
    for mod_rel in NEOFORGE_MODULE_JARS {
        let in_game = local_libs_dir.join(mod_rel);
        let in_mc = mc_libs_dir.join(mod_rel);

        if in_game.exists() {
            module_entries.push(in_game);
        } else if in_mc.exists() {
            module_entries.push(in_mc);
        } else {
            let full_url = format!("https://maven.neoforged.net/releases/{}", mod_rel);
            download_file_if_missing(&client, &full_url, &in_game).await?;
            module_entries.push(in_game);
        }
    }

    // B. Assemblage du Classpath (-cp) avec DÉDUPLICATION stricte (évite les conflits UnionFS)
    let mut classpath_entries: Vec<PathBuf> = Vec::new();
    let mut seen_paths: HashSet<PathBuf> = HashSet::new();

    // 1. Librairies NeoForge
    for nlib in &neoforge_meta.libraries {
        if let Some(downloads) = &nlib.downloads {
            if let Some(artifact) = &downloads.artifact {
                let in_game = local_libs_dir.join(&artifact.path);
                let in_mc = mc_libs_dir.join(&artifact.path);

                let target = if in_game.exists() {
                    in_game
                } else if in_mc.exists() {
                    in_mc
                } else {
                    download_file_if_missing(&client, &artifact.url, &in_game).await?;
                    in_game
                };

                if seen_paths.insert(target.clone()) {
                    classpath_entries.push(target);
                }
            }
        }
    }

    // 2. Librairies Vanilla Mojang
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

                let target = if in_game.exists() {
                    in_game
                } else if in_mc.exists() {
                    in_mc
                } else {
                    emit_launch_event(
                        &app,
                        "downloading_libs",
                        &format!("Téléchargement de {} ({}/{})", vlib.name, i + 1, total_vlibs),
                        60.0 + ((i as f64) / (total_vlibs as f64)) * 30.0,
                    );
                    download_file_if_missing(&client, &artifact.url, &in_game).await?;
                    in_game
                };

                if seen_paths.insert(target.clone()) {
                    classpath_entries.push(target);
                }
            }
        }
    }

    // 3. Client JAR officiel en fin de Classpath
    if seen_paths.insert(client_jar_path.clone()) {
        classpath_entries.push(client_jar_path);
    }

    // 6. Assets directory
    let assets_dir = if dot_minecraft.join("assets").exists() {
        dot_minecraft.join("assets")
    } else {
        game_dir.join("assets")
    };

    let asset_index = vanilla_meta
        .asset_index
        .as_ref()
        .map(|a| a.id.clone())
        .unwrap_or_else(|| "17".to_string());

    // Assurer que l'index d'assets (ex: 17.json) et TOUS les sons/textures (panorama) sont téléchargés
    if let Some(index_meta) = &vanilla_meta.asset_index {
        let index_file = assets_dir.join("indexes").join(format!("{}.json", index_meta.id));
        if !index_file.exists() {
            emit_launch_event(
                &app,
                "downloading_assets_index",
                &format!("Téléchargement de l'index des ressources ({}.json)...", index_meta.id),
                80.0,
            );
            download_file_if_missing(&client, &index_meta.url, &index_file).await?;
        }

        // Vérification et téléchargement concurrent des sons et textures manquants
        if index_file.exists() {
            if let Ok(content) = fs::read_to_string(&index_file) {
                if let Ok(asset_index_data) = serde_json::from_str::<AssetIndexFile>(&content) {
                    let objects_dir = assets_dir.join("objects");
                    let mut missing_assets: Vec<(String, String)> = Vec::new();

                    for (_name, obj) in asset_index_data.objects {
                        if obj.hash.len() >= 2 {
                            let prefix = obj.hash[..2].to_string();
                            let target_path = objects_dir.join(&prefix).join(&obj.hash);
                            if !target_path.exists() {
                                missing_assets.push((obj.hash, prefix));
                            }
                        }
                    }

                    let total_missing = missing_assets.len();
                    if total_missing > 0 {
                        emit_launch_event(
                            &app,
                            "downloading_assets",
                            &format!("Téléchargement des sons et textures (0/{})...", total_missing),
                            82.0,
                        );

                        let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(25));
                        let completed_counter = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
                        let mut tasks = Vec::new();

                        for (hash, prefix) in missing_assets {
                            let sem = semaphore.clone();
                            let client_clone = client.clone();
                            let counter = completed_counter.clone();
                            let app_handle = app.clone();
                            let target_dir = objects_dir.join(&prefix);
                            let target_file = target_dir.join(&hash);
                            let url = format!("https://resources.download.minecraft.net/{}/{}", prefix, hash);

                            tasks.push(tokio::spawn(async move {
                                let _permit = sem.acquire().await;
                                if !target_file.exists() {
                                    let _ = fs::create_dir_all(&target_dir);
                                    if let Ok(resp) = client_clone.get(&url).send().await {
                                        if resp.status().is_success() {
                                            if let Ok(bytes) = resp.bytes().await {
                                                let _ = fs::write(&target_file, &bytes);
                                            }
                                        }
                                    }
                                }
                                let current = counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
                                if current % 50 == 0 || current == total_missing {
                                    emit_launch_event(
                                        &app_handle,
                                        "downloading_assets",
                                        &format!("Téléchargement des sons et textures ({}/{})...", current, total_missing),
                                        82.0 + ((current as f64) / (total_missing as f64)) * 12.0,
                                    );
                                }
                            }));
                        }

                        for t in tasks {
                            let _ = t.await;
                        }
                    }
                }
            }
        }
    }

    let classpath_separator = if cfg!(windows) { ";" } else { ":" };

    let module_path = module_entries
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<String>>()
        .join(classpath_separator);

    let classpath = classpath_entries
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<String>>()
        .join(classpath_separator);

    let uuid = generate_offline_uuid(&username);

    // 7. Lancement du processus Java NeoForge
    emit_launch_event(
        &app,
        "spawning",
        &format!("Démarrage de Minecraft NeoForge pour {} (RAM: {} Mo)...", username, ram_mb),
        95.0,
    );

    let log_file_path = logs_dir.join("latest-game.log");
    let log_file = File::create(&log_file_path).map_err(|e| e.to_string())?;

    let mut cmd = Command::new("java");
    cmd.current_dir(&game_dir);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        cmd.creation_flags(CREATE_NEW_PROCESS_GROUP);
    }

    // Arguments JVM NeoForge & FML
    cmd.arg(format!("-Xmx{}M", ram_mb))
        .arg("-Xms1024M")
        .arg("-Djava.net.preferIPv6Addresses=system")
        .arg(format!("-DignoreList=client-extra,neoforge-{}.jar,{}.jar", NEOFORGE_VERSION, VANILLA_VERSION))
        .arg(format!("-DlibraryDirectory={}", primary_libs_dir.to_string_lossy()))
        .arg("-p")
        .arg(&module_path)
        .arg("--add-modules")
        .arg("ALL-MODULE-PATH")
        .arg("--add-opens")
        .arg("java.base/java.util.jar=cpw.mods.securejarhandler")
        .arg("--add-opens")
        .arg("java.base/java.lang.invoke=cpw.mods.securejarhandler")
        .arg("--add-exports")
        .arg("java.base/sun.security.util=cpw.mods.securejarhandler")
        .arg("--add-exports")
        .arg("jdk.naming.dns/com.sun.jndi.dns=java.naming")
        .arg("-cp")
        .arg(&classpath)
        .arg("cpw.mods.bootstraplauncher.BootstrapLauncher")
        // Arguments de jeu NeoForge
        .arg("--fml.neoForgeVersion")
        .arg(NEOFORGE_VERSION)
        .arg("--fml.fmlVersion")
        .arg(FML_VERSION)
        .arg("--fml.mcVersion")
        .arg(VANILLA_VERSION)
        .arg("--fml.neoFormVersion")
        .arg(NEOFORM_VERSION)
        .arg("--launchTarget")
        .arg("forgeclient")
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
        &format!("Minecraft 1.21.1 NeoForge est lancé avec succès ! (PID: {})", pid),
        100.0,
    );

    Ok(format!("Minecraft NeoForge lancé avec succès (PID: {})", pid))
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
        let path = maven_to_path("net.neoforged:bus:8.0.5");
        assert_eq!(path, "net/neoforged/bus/8.0.5/bus-8.0.5.jar");
    }
}
