import fs from "node:fs";
import path from "node:path";

const appdata = process.env.APPDATA;
const indexFile = path.join(appdata, ".minecraft", "assets", "indexes", "17.json");

if (!fs.existsSync(indexFile)) {
  console.error("Index 17.json introuvable.");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const objects = index.objects;
const objDir = path.join(appdata, ".minecraft", "assets", "objects");

const missing = [];
for (const [key, val] of Object.entries(objects)) {
  const hash = val.hash;
  const prefix = hash.substring(0, 2);
  const targetDir = path.join(objDir, prefix);
  const targetPath = path.join(targetDir, hash);
  if (!fs.existsSync(targetPath)) {
    missing.push({ hash, prefix, targetDir, targetPath, size: val.size });
  }
}

console.log(`Assets à télécharger : ${missing.length}`);

if (missing.length === 0) {
  console.log("Tous les assets sont déjà présents !");
  process.exit(0);
}

const CONCURRENCY = 30;
let downloaded = 0;
let failed = 0;
let downloadedBytes = 0;
const total = missing.length;

async function downloadItem(item) {
  const url = `https://resources.download.minecraft.net/${item.prefix}/${item.hash}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    fs.mkdirSync(item.targetDir, { recursive: true });
    fs.writeFileSync(item.targetPath, Buffer.from(buf));
    downloaded++;
    downloadedBytes += buf.byteLength;
    if (downloaded % 100 === 0 || downloaded === total) {
      const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
      process.stdout.write(`\rTéléchargement sons/assets : ${downloaded}/${total} (${mb} Mo)...`);
    }
  } catch (err) {
    failed++;
  }
}

async function worker(queue) {
  while (queue.length > 0) {
    const item = queue.pop();
    if (item) {
      await downloadItem(item);
    }
  }
}

const queue = [...missing];
const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));

const start = Date.now();
await Promise.all(workers);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log(`\nTerminé en ${elapsed}s ! ${downloaded} téléchargés, ${failed} erreurs.`);
