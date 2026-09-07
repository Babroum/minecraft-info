import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const modsDirectory = path.resolve("modpacks/mods");
const manifestPath = path.resolve("modpacks/manifest.json");

function sha256(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

if (!fs.existsSync(modsDirectory)) {
    console.error("Le dossier modpacks/mods n'existe pas.");
    process.exit(1);
}

const files = fs
    .readdirSync(modsDirectory)
    .filter((file) => file.endsWith(".jar"))
    .sort();

const mods = files.map((file) => {
    const filePath = path.join(modsDirectory, file);

    return {
        file,
        sha256: sha256(filePath)
    };
});

const manifest = {
    name: "NationGlory",
    version: "0.1.0",
    minecraft: {
        version: "1.21.1",
        loader: "neoforge"
    },
    mods
};

fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n"
);

console.log(`Manifest généré : ${mods.length} mods.`);