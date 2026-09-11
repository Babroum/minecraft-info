import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const srcDir = path.resolve("kubejs");
const destDir = path.resolve("server/kubejs");

// 1. Sauvegarde des données runtime du serveur (nation_homes, wars, etc.) vers la racine avant sync
const serverDataDir = path.join(destDir, "data");
const rootDataDir = path.join(srcDir, "data");
if (fs.existsSync(serverDataDir)) {
    if (!fs.existsSync(rootDataDir)) fs.mkdirSync(rootDataDir, { recursive: true });
    const dataFiles = fs.readdirSync(serverDataDir);
    for (const df of dataFiles) {
        const sFile = path.join(serverDataDir, df);
        const rFile = path.join(rootDataDir, df);
        if (fs.statSync(sFile).isFile()) {
            // Si le fichier serveur a du contenu et que la racine est vide ou plus ancienne, sauver
            const sContent = fs.readFileSync(sFile, "utf8").trim();
            if (sContent && sContent !== "{}") {
                fs.copyFileSync(sFile, rFile);
            }
        }
    }
}

function copyDirRecursive(src, dest, isDataDir = false, skipDataDir = false) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        if (skipDataDir && entry.name === "data") {
            continue; // Exclure les données internes serveur du client
        }

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        const isData = isDataDir || (entry.name === "data");

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath, isData, skipDataDir);
        } else {
            // Seuls les fichiers dans le dossier "data" ne doivent pas écraser les données actives non-vides du serveur
            if (isData && fs.existsSync(destPath)) {
                const existing = fs.readFileSync(destPath, "utf8").trim();
                if (existing && existing !== "{}") {
                    continue;
                }
            }
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log(`Synchronisation de ${srcDir} vers ${destDir}...`);
copyDirRecursive(srcDir, destDir, false, false);
console.log("Synchronisation vers le serveur terminée avec succès !");

const appData = process.env.APPDATA;
if (appData) {
    const clientDir = path.join(appData, ".serveur-info", "kubejs");
    if (fs.existsSync(path.join(appData, ".serveur-info"))) {
        console.log(`Synchronisation de ${srcDir} vers le client ${clientDir}...`);
        copyDirRecursive(srcDir, clientDir, false, true);
        console.log("Synchronisation vers le client terminée avec succès !");
    }
}

console.log("Mise à jour du manifest pour le launcher...");
execSync("node tools/generate-manifest.mjs", { stdio: "inherit" });
