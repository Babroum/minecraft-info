import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.resolve(__dirname, "certs");
fs.mkdirSync(certsDir, { recursive: true });

const keyPath = path.join(certsDir, "key.pem");
const certPath = path.join(certsDir, "cert.pem");

console.log("Generating self-signed SSL certificate...");

// Create a minimal openssl.cnf in a temp location
const tmpCnf = path.join(os.tmpdir(), "thirdworld-openssl.cnf");
fs.writeFileSync(tmpCnf, `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = Third World Launcher API
O = Third World

[v3_req]
subjectAltName = DNS:localhost,IP:127.0.0.1
`);

try {
  // Set OPENSSL_CONF to our custom config to bypass broken default config
  const env = { ...process.env, OPENSSL_CONF: tmpCnf };

  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 3650 -nodes -config "${tmpCnf}" -extensions v3_req`,
    { env, stdio: "pipe" }
  );

  console.log(`Certificates generated in ${certsDir}`);
  console.log("  - key.pem (private key)");
  console.log("  - cert.pem (self-signed certificate, valid 10 years)");
} catch (e) {
  console.error("OpenSSL generation failed:", e.stderr?.toString() || e.message);
  process.exit(1);
} finally {
  // Cleanup temp config
  try { fs.unlinkSync(tmpCnf); } catch {}
}
