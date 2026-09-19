import { pbkdf2Sync, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const iterations = 600_000;
const [target] = process.argv.slice(2);
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (target !== "--local" && target !== "--remote") {
  console.error("Usage: node scripts/bootstrap-admin.mjs --local|--remote");
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("ADMIN_EMAIL must be a valid email address");
  process.exit(1);
}
if (!password || password.length < 12 || password.length > 1024) {
  console.error("ADMIN_PASSWORD must be between 12 and 1024 characters");
  process.exit(1);
}

const base64Url = (value) => value.toString("base64url");
const salt = randomBytes(16);
const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const passwordHash = `pbkdf2-sha256$${iterations}$${base64Url(salt)}$${base64Url(derived)}`;
const displayName = email.slice(0, email.indexOf("@")) || email;
const sqlValue = (value) => `'${value.replaceAll("'", "''")}'`;
const sql = `
INSERT INTO role_grants (email, role, updated_at)
VALUES (${sqlValue(email)}, 'admin', CURRENT_TIMESTAMP)
ON CONFLICT(email) DO UPDATE SET role = 'admin', updated_at = CURRENT_TIMESTAMP;

INSERT INTO users (email, display_name, password_hash, role, updated_at)
VALUES (${sqlValue(email)}, ${sqlValue(displayName)}, ${sqlValue(passwordHash)}, 'admin', CURRENT_TIMESTAMP)
ON CONFLICT(email) DO UPDATE SET
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  role = 'admin',
  updated_at = CURRENT_TIMESTAMP;

DELETE FROM sessions
WHERE user_id = (SELECT id FROM users WHERE email = ${sqlValue(email)});
`;

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["wrangler", "d1", "execute", "pai-platform", target, "--command", sql], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
