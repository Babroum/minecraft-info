import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SERVER_DIR = path.resolve("server");
const WORLD_DIR = path.join(SERVER_DIR, "world");
const BACKUP_DIR = path.join(SERVER_DIR, "ftbbackups3");

const ONU_TEAM_ID = "cb440140-1d45-4eff-9b10-2bab3d457d63";

function createWorldBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(BACKUP_DIR, `pre_wipe_backup_${timestamp}.zip`);

    console.log(`[Backup] Création de la sauvegarde de sécurité : ${backupFile}...`);

    const pyScript = `import zipfile, os
world_dir = r"${WORLD_DIR}"
backup_file = r"${backupFile}"
with zipfile.ZipFile(backup_file, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(world_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, r"${SERVER_DIR}")
            z.write(full_path, rel_path)
size_mb = os.path.getsize(backup_file) / (1024 * 1024)
print(f"[Backup] Sauvegarde terminee : {size_mb:.2f} MB")
`;
    const tempPy = path.resolve("tools/temp_backup.py");
    fs.writeFileSync(tempPy, pyScript, "utf8");
    try {
        execSync(`python "${tempPy}"`, { stdio: "inherit" });
    } finally {
        if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy);
    }
    return backupFile;
}

function removeDirContents(dirPath, filterFn = null) {
    if (!fs.existsSync(dirPath)) return 0;
    let count = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (filterFn && !filterFn(entry.name, entry.isDirectory())) {
            continue;
        }
        if (entry.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            count++;
        } else {
            fs.unlinkSync(fullPath);
            count++;
        }
    }
    return count;
}

function isServerRunning() {
    const sessionLockPath = path.join(WORLD_DIR, "session.lock");
    if (!fs.existsSync(sessionLockPath)) return false;
    try {
        const fd = fs.openSync(sessionLockPath, "r+");
        fs.closeSync(fd);
        return false;
    } catch (e) {
        return true;
    }
}

async function runCleanup() {
    if (isServerRunning()) {
        console.error("\n❌ ERREUR : Le serveur est actuellement allumé !");
        console.error("Veuillez éteindre le serveur proprement (tapez /stop) avant d'exécuter la réinitialisation.\n");
        process.exit(1);
    }

    console.log("=== DÉBUT DE LA PURGE DES DONNÉES DE TEST ===");

    // 1. Sauvegarde préalable
    createWorldBackup();

    // 2. Nettoyage des dossiers joueurs
    console.log("[1/6] Nettoyage des données joueurs (playerdata, stats, advancements)...");
    const pdCount = removeDirContents(path.join(WORLD_DIR, "playerdata"));
    const statsCount = removeDirContents(path.join(WORLD_DIR, "stats"));
    const advCount = removeDirContents(path.join(WORLD_DIR, "advancements"));
    console.log(`  -> ${pdCount} playerdata, ${statsCount} stats, ${advCount} advancements supprimés.`);

    // 3. Nettoyage du cache et des ops
    console.log("[2/6] Réinitialisation des ops et des caches de pseudos...");
    fs.writeFileSync(path.join(SERVER_DIR, "ops.json"), "[]\n");
    fs.writeFileSync(path.join(SERVER_DIR, "usercache.json"), "[]\n");
    fs.writeFileSync(path.join(SERVER_DIR, "usernamecache.json"), "{}\n");
    console.log("  -> ops.json, usercache.json et usernamecache.json remis à zéro.");

    // 4. Nettoyage FTB Teams (garde uniquement la team server ONU)
    console.log("[3/6] Nettoyage des équipes FTB Teams (Préservation team serveur ONU)...");
    const partyCount = removeDirContents(path.join(WORLD_DIR, "ftbteams", "party"));
    const playerCount = removeDirContents(path.join(WORLD_DIR, "ftbteams", "player"));
    console.log(`  -> ${partyCount} party et ${playerCount} player teams supprimées.`);
    const onuTeamPath = path.join(WORLD_DIR, "ftbteams", "server", `${ONU_TEAM_ID}.snbt`);
    if (fs.existsSync(onuTeamPath)) {
        console.log(`  -> Team ONU confirmée et préservée (${onuTeamPath})`);
    } else {
        console.warn("  -> ATTENTION: Team ONU non trouvée dans ftbteams/server !");
    }

    // 5. Nettoyage FTB Chunks (garde uniquement les claims de l'ONU)
    console.log("[4/6] Nettoyage des revendications FTB Chunks (Préservation claims ONU)...");
    const ftbChunksDir = path.join(WORLD_DIR, "ftbchunks");
    const claimsRemoved = removeDirContents(ftbChunksDir, (filename) => {
        return filename !== `${ONU_TEAM_ID}.snbt`;
    });
    console.log(`  -> ${claimsRemoved} fichier(s) de claims supprimé(s). Claims ONU préservés.`);

    // 6. Nettoyage économie Lightman's Currency
    console.log("[5/6] Nettoyage des données bancaires et marchands de test...");
    const worldDataDir = path.join(WORLD_DIR, "data");
    if (fs.existsSync(worldDataDir)) {
        const dataFiles = fs.readdirSync(worldDataDir);
        for (const f of dataFiles) {
            if (f.startsWith("lightmanscurrency_")) {
                fs.unlinkSync(path.join(worldDataDir, f));
                console.log(`  -> Supprimé : world/data/${f}`);
            }
        }
    }

    const kubejsPersistent = path.join(WORLD_DIR, "kubejs_persistent_data.nbt");
    if (fs.existsSync(kubejsPersistent)) {
        fs.unlinkSync(kubejsPersistent);
        console.log("  -> Supprimé : world/kubejs_persistent_data.nbt");
    }

    // 7. Réinitialisation des registres KubeJS géopolitiques
    console.log("[6/6] Réinitialisation des registres géopolitiques KubeJS...");
    const kubejsDirs = [path.resolve("kubejs/data"), path.join(SERVER_DIR, "kubejs/data")];
    for (const kdir of kubejsDirs) {
        if (!fs.existsSync(kdir)) continue;

        // Réinitialiser les fichiers
        fs.writeFileSync(path.join(kdir, "nation_homes.json"), "{}\n");
        fs.writeFileSync(path.join(kdir, "nation_taxes.json"), "{}\n");

        const warsPath = path.join(kdir, "wars.json");
        if (fs.existsSync(warsPath)) {
            fs.writeFileSync(warsPath, "{}\n");
        }

        const contractPath = path.join(kdir, "active_onu_contract.json");
        if (fs.existsSync(contractPath)) {
            fs.unlinkSync(contractPath);
        }

        const marketPath = path.join(kdir, "onu_market_data.json");
        if (fs.existsSync(marketPath)) {
            fs.unlinkSync(marketPath);
        }

        const onuTpPath = path.join(kdir, "onu_teleport.json");
        fs.writeFileSync(onuTpPath, JSON.stringify({
            public_enabled: false,
            dim: "minecraft:overworld",
            x: -204.5,
            y: 76.0,
            z: -172.5,
            yaw: 0.0,
            pitch: 0.0
        }, null, 2) + "\n");
    }
    console.log("  -> Registres nation_homes, nation_taxes, wars, active_onu_contract, onu_market_data, onu_teleport réinitialisés.");

    console.log("\n=== NETTOYAGE TERMINÉ AVEC SUCCÈS ===");
}

runCleanup().catch((err) => {
    console.error("Erreur durant le nettoyage :", err);
    process.exit(1);
});
