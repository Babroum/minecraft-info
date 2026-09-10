import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";

const ROOT_DIR = path.resolve(__dirname, "../..");
const MODPACKS_DIR = path.resolve(ROOT_DIR, "modpacks");
const MODS_DIR = path.resolve(MODPACKS_DIR, "mods");
const RESOURCEPACKS_DIR = path.resolve(MODPACKS_DIR, "resourcepacks");
const DATAPACKS_DIR = path.resolve(MODPACKS_DIR, "datapacks");
const KUBEJS_DIR = path.resolve(ROOT_DIR, "kubejs");
const MANIFEST_PATH = path.resolve(MODPACKS_DIR, "manifest.json");

// --- Auth storage ---
const ACCOUNTS_PATH = path.resolve(__dirname, "accounts.json");
const SESSIONS_PATH = path.resolve(__dirname, "sessions.json");
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function loadSessions() {
  if (!fs.existsSync(SESSIONS_PATH)) {
    return new Map();
  }
  try {
    const raw = JSON.parse(fs.readFileSync(SESSIONS_PATH, "utf-8"));
    const map = new Map();
    const now = Date.now();
    for (const [token, session] of Object.entries(raw)) {
      if (session && session.expiresAt > now) {
        map.set(token, session);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveSessions(map) {
  try {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(SESSIONS_PATH, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur sauvegarde sessions:", e);
  }
}

const sessions = loadSessions();

function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_PATH)) {
    return { players: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, "utf-8"));
  } catch {
    return { players: {} };
  }
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), "utf-8");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST }).toString("hex");
}

function generateToken() {
  return crypto.randomUUID();
}

function createSession(username) {
  const token = generateToken();
  sessions.set(token, {
    username,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  saveSessions(sessions);
  return token;
}

function verifySession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    saveSessions(sessions);
    return null;
  }
  return session;
}

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token);
      changed = true;
    }
  }
  if (changed) saveSessions(sessions);
}, 10 * 60 * 1000);

// --- CORS & helpers ---
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
    req.on("error", reject);
  });
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

// --- Request handler ---
async function handleRequest(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // ===== AUTH ENDPOINTS =====

  // POST /auth/register
  if (pathname === "/auth/register" && req.method === "POST") {
    try {
      const { username, password } = await readBody(req);

      if (!username || typeof username !== "string" || username.trim().length < 3 || username.trim().length > 16) {
        return sendError(res, 400, "Le pseudo doit faire entre 3 et 16 caractères.");
      }
      if (!password || typeof password !== "string" || password.length < 4) {
        return sendError(res, 400, "Le mot de passe doit faire au moins 4 caractères.");
      }

      // Only allow valid Minecraft-style usernames
      const cleanUsername = username.trim();
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return sendError(res, 400, "Le pseudo ne peut contenir que des lettres, chiffres et underscores.");
      }

      const accounts = loadAccounts();
      // Case-insensitive check
      const existingKey = Object.keys(accounts.players).find(
        (k) => k.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (existingKey) {
        return sendError(res, 409, "Ce pseudo est déjà pris.");
      }

      const salt = crypto.randomBytes(32).toString("hex");
      const passwordHash = hashPassword(password, salt);

      accounts.players[cleanUsername] = {
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      };
      saveAccounts(accounts);

      const token = createSession(cleanUsername);
      return sendJson(res, 201, { success: true, username: cleanUsername, token });
    } catch (e) {
      return sendError(res, 400, e.message || "Requête invalide");
    }
  }

  // POST /auth/login
  if (pathname === "/auth/login" && req.method === "POST") {
    try {
      const { username, password } = await readBody(req);

      if (!username || !password) {
        return sendError(res, 400, "Pseudo et mot de passe requis.");
      }

      const accounts = loadAccounts();
      // Case-insensitive lookup, but return the original case
      const matchedKey = Object.keys(accounts.players).find(
        (k) => k.toLowerCase() === username.trim().toLowerCase()
      );

      if (!matchedKey) {
        return sendError(res, 401, "Pseudo ou mot de passe incorrect.");
      }

      const account = accounts.players[matchedKey];
      const attemptHash = hashPassword(password, account.salt);

      if (attemptHash !== account.passwordHash) {
        return sendError(res, 401, "Pseudo ou mot de passe incorrect.");
      }

      const token = createSession(matchedKey);
      return sendJson(res, 200, { success: true, username: matchedKey, token });
    } catch (e) {
      return sendError(res, 400, e.message || "Requête invalide");
    }
  }

  // GET /auth/verify?token=...
  if (pathname === "/auth/verify" && req.method === "GET") {
    const token = parsedUrl.searchParams.get("token");
    if (!token) {
      return sendError(res, 400, "Token manquant.");
    }

    const session = verifySession(token);
    if (!session) {
      return sendError(res, 401, "Token invalide ou expiré.");
    }

    return sendJson(res, 200, { valid: true, username: session.username });
  }

  // ===== EXISTING ENDPOINTS =====

  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendError(res, 405, "Méthode non autorisée");
  }

  // 1. Endpoint Manifest JSON
  if (pathname === "/manifest.json") {
    if (!fs.existsSync(MANIFEST_PATH)) {
      return sendError(res, 404, "Manifest non trouvé dans modpacks/manifest.json. Exécutez 'npm run manifest'.");
    }
    return streamFile(req, res, MANIFEST_PATH, "application/json; charset=utf-8");
  }

  // 1b. Endpoint Resource Pack
  if (pathname === "/resourcepack.zip" || pathname === "/resourcepacks/ThirdWorld-Assets.zip") {
    const resourcePackPath = path.resolve(ROOT_DIR, "modpacks/resourcepacks/ThirdWorld-Assets.zip");
    if (!fs.existsSync(resourcePackPath)) {
      return sendError(res, 404, "Pack de ressources introuvable.");
    }
    return streamFile(req, res, resourcePackPath, "application/zip");
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

  // 4. Distribution des Resource Packs (/resourcepacks/:filename)
  if (pathname.startsWith("/resourcepacks/")) {
    const filename = pathname.slice("/resourcepacks/".length);
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return sendError(res, 400, "Nom de fichier invalide");
    }

    const rpFilePath = path.join(RESOURCEPACKS_DIR, filename);
    if (!fs.existsSync(rpFilePath)) {
      return sendError(res, 404, `Resource pack non trouvé: ${filename}`);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return streamFile(req, res, rpFilePath, "application/zip");
  }

  // 5. Distribution des Data Packs (/datapacks/:filename)
  if (pathname.startsWith("/datapacks/")) {
    const filename = pathname.slice("/datapacks/".length);
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return sendError(res, 400, "Nom de fichier invalide");
    }

    const dpFilePath = path.join(DATAPACKS_DIR, filename);
    if (!fs.existsSync(dpFilePath)) {
      return sendError(res, 404, `Datapack non trouvé: ${filename}`);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return streamFile(req, res, dpFilePath, "application/zip");
  }

  // 6. Distribution des fichiers KubeJS (/kubejs/*)
  if (pathname.startsWith("/kubejs/")) {
    const relPath = pathname.slice("/kubejs/".length);
    if (!relPath || relPath.includes("..")) {
      return sendError(res, 400, "Chemin invalide");
    }

    const kubeFilePath = path.join(KUBEJS_DIR, relPath);
    if (!fs.existsSync(kubeFilePath)) {
      return sendError(res, 404, `Fichier KubeJS non trouvé: ${relPath}`);
    }

    let contentType = "text/plain; charset=utf-8";
    if (relPath.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
    else if (relPath.endsWith(".json")) contentType = "application/json; charset=utf-8";
    else if (relPath.endsWith(".png")) contentType = "image/png";

    return streamFile(req, res, kubeFilePath, contentType);
  }

  // Endpoint d'accueil API
  if (pathname === "/") {
    return sendJson(res, 200, {
      service: "Third World Launcher API",
      status: "online",
      protocol: "HTTPS",
      endpoints: {
        manifest: "/manifest.json",
        info: "/info",
        mods: "/mods/:filename",
        resourcepacks: "/resourcepacks/:filename",
        datapacks: "/datapacks/:filename",
        kubejs: "/kubejs/*",
        auth: {
          register: "POST /auth/register",
          login: "POST /auth/login",
          verify: "GET /auth/verify?token=...",
        }
      }
    });
  }

  return sendError(res, 404, "Endpoint non trouvé");
}

// --- HTTPS Server ---
const certsDir = path.resolve(__dirname, "certs");
const keyPath = path.join(certsDir, "key.pem");
const certPath = path.join(certsDir, "cert.pem");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  const server = https.createServer(sslOptions, handleRequest);

  server.listen(PORT, HOST, () => {
    console.log(`\n=================================================`);
    console.log(`🔒 API Third World HTTPS active ! (port ${PORT})`);
    console.log(`📦 Manifest : https://localhost:${PORT}/manifest.json`);
    console.log(`📊 Info     : https://localhost:${PORT}/info`);
    console.log(`🔑 Auth     : https://localhost:${PORT}/auth/...`);
    console.log(`📂 Modpacks : ${MODPACKS_DIR}`);
    console.log(`=================================================\n`);
  });
} else {
  console.warn(`⚠️  Certificats SSL non trouvés dans ${certsDir}`);
  console.warn(`   Démarrage en HTTP (non sécurisé) en attendant...`);
  console.warn(`   Générez les certificats avec: npm run api:gen-certs\n`);

  const server = http.createServer(handleRequest);

  server.listen(PORT, HOST, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 API Third World HTTP active ! (port ${PORT})`);
    console.log(`📦 Manifest : http://localhost:${PORT}/manifest.json`);
    console.log(`📊 Info     : http://localhost:${PORT}/info`);
    console.log(`🔑 Auth     : http://localhost:${PORT}/auth/...`);
    console.log(`📂 Modpacks : ${MODPACKS_DIR}`);
    console.log(`=================================================\n`);
  });
}
