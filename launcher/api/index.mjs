import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";

const ROOT_DIR = path.resolve(__dirname, "../..");
const MODPACKS_DIR = path.resolve(ROOT_DIR, "modpacks");
const MODS_DIR = path.resolve(MODPACKS_DIR, "mods");
const MANIFEST_PATH = path.resolve(MODPACKS_DIR, "manifest.json");

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message, code: statusCode });
}

function streamFile(req, res, filePath, contentType) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return sendError(res, 404, "Fichier non trouvé");
    }

    setCorsHeaders(res);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType || "application/octet-stream");

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        return res.end();
      }

      const chunksize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Content-Length": chunksize
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, { "Content-Length": stats.size });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendError(res, 405, "Méthode non autorisée");
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. Endpoint Manifest JSON
  if (pathname === "/manifest.json") {
    if (!fs.existsSync(MANIFEST_PATH)) {
      return sendError(res, 404, "Manifest non trouvé dans modpacks/manifest.json. Exécutez 'npm run manifest'.");
    }
    return streamFile(req, res, MANIFEST_PATH, "application/json; charset=utf-8");
  }

  // 2. Endpoint Statistiques API
  if (pathname === "/info" || pathname === "/api/info" || pathname === "/health") {
    if (!fs.existsSync(MANIFEST_PATH)) {
      return sendError(res, 404, "Manifest absent");
    }

    try {
      const manifestRaw = fs.readFileSync(MANIFEST_PATH, "utf-8");
      const manifest = JSON.parse(manifestRaw);

      let totalBytes = 0;
      const modsWithStats = manifest.mods.map((m) => {
        const filePath = path.join(MODS_DIR, m.file);
        let size = 0;
        if (fs.existsSync(filePath)) {
          size = fs.statSync(filePath).size;
          totalBytes += size;
        }
        return {
          ...m,
          size,
          sizeFormatted: (size / (1024 * 1024)).toFixed(2) + " Mo",
          downloadUrl: `/mods/${encodeURIComponent(m.file)}`
        };
      });

      return sendJson(res, 200, {
        status: "ok",
        name: manifest.name,
        version: manifest.version,
        minecraft: manifest.minecraft,
        totalMods: manifest.mods.length,
        totalBytes,
        totalSizeFormatted: (totalBytes / (1024 * 1024)).toFixed(2) + " Mo",
        mods: modsWithStats
      });
    } catch (e) {
      return sendError(res, 500, "Erreur lecture manifest: " + e.message);
    }
  }

  // 3. Distribution des Mods (/mods/:filename)
  if (pathname.startsWith("/mods/")) {
    const filename = pathname.slice("/mods/".length);
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return sendError(res, 400, "Nom de fichier invalide");
    }

    const modFilePath = path.join(MODS_DIR, filename);
    if (!fs.existsSync(modFilePath)) {
      return sendError(res, 404, `Mod non trouvé: ${filename}`);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return streamFile(req, res, modFilePath, "application/java-archive");
  }

  // Endpoint d'accueil API
  if (pathname === "/") {
    return sendJson(res, 200, {
      service: "NationGlory Launcher API",
      status: "online",
      endpoints: {
        manifest: "/manifest.json",
        info: "/info",
        mods: "/mods/:filename"
      }
    });
  }

  return sendError(res, 404, "Endpoint non trouvé");
});

server.listen(PORT, HOST, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 API NationGlory active ! (port ${PORT})`);
  console.log(`📦 Manifest : http://localhost:${PORT}/manifest.json`);
  console.log(`📊 Info     : http://localhost:${PORT}/info`);
  console.log(`📂 Modpacks : ${MODPACKS_DIR}`);
  console.log(`=================================================\n`);
});
