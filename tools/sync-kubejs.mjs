import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve("kubejs");
const destDir = path.resolve("server/kubejs");

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log(`Synchronisation de ${srcDir} vers ${destDir}...`);
copyDirRecursive(srcDir, destDir);
console.log("Synchronisation vers le serveur terminée avec succès !");

const appData = process.env.APPDATA;
if (appData) {
    const clientDir = path.join(appData, ".serveur-info", "kubejs");
    if (fs.existsSync(path.join(appData, ".serveur-info"))) {
        console.log(`Synchronisation de ${srcDir} vers le client ${clientDir}...`);
        copyDirRecursive(srcDir, clientDir);
        console.log("Synchronisation vers le client terminée avec succès !");
    }
}

import { execSync } from "node:child_process";
console.log("Mise à jour du manifest pour le launcher...");
execSync("node tools/generate-manifest.mjs", { stdio: "inherit" });
