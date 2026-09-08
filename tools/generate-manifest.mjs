import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const modsDirectory = path.resolve("modpacks/mods");
const resourcepacksDirectory = path.resolve("modpacks/resourcepacks");
const datapacksDirectory = path.resolve("modpacks/datapacks");
const manifestPath = path.resolve("modpacks/manifest.json");

const kubejsDirectory = path.resolve("kubejs");

function sha256(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function scanDir(dir, ext) {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(ext))
        .sort()
        .map((file) => {
            const filePath = path.join(dir, file);
            return {
                file,
                sha256: sha256(filePath)
            };
        });
}

function scanDirRecursive(baseDir, currentRel = "") {
    const fullDir = path.join(baseDir, currentRel);
    if (!fs.existsSync(fullDir)) return [];
    let results = [];
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
        const relPath = path.join(currentRel, entry.name).replace(/\\/g, "/");
        if (entry.isDirectory()) {
            results = results.concat(scanDirRecursive(baseDir, relPath));
        } else if (entry.isFile()) {
            results.push({
                file: relPath,
                sha256: sha256(path.join(baseDir, relPath))
            });
        }
    }
    return results.sort((a, b) => a.file.localeCompare(b.file));
}

if (!fs.existsSync(modsDirectory)) {
    console.error("Le dossier modpacks/mods n'existe pas.");
    process.exit(1);
}

const mods = scanDir(modsDirectory, ".jar");
const resourcepacks = scanDir(resourcepacksDirectory, ".zip");
const datapacks = scanDir(datapacksDirectory, ".zip");
const kubejs = scanDirRecursive(kubejsDirectory);

const manifest = {
    name: "NationGlory",
    version: "0.1.0",
    minecraft: {
        version: "1.21.1",
        loader: "neoforge"
    },
    mods,
    resourcepacks,
    datapacks,
    kubejs
};

fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n"
);

console.log(`Manifest généré : ${mods.length} mods, ${resourcepacks.length} resourcepacks, ${datapacks.length} datapacks, ${kubejs.length} fichiers kubejs.`);