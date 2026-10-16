import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// This is an operator command, never an app endpoint or scheduled Worker job.
const [scope, destination, ...extra] = process.argv.slice(2);
if (!["--local", "--remote"].includes(scope) || !destination || extra.length) {
  console.error("Usage: node scripts/backup-d1.mjs <--local|--remote> <protected-directory-outside-repo>");
  process.exit(1);
}

process.umask(0o077);
const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const target = resolve(destination);
mkdirSync(target, { recursive: true, mode: 0o700 });
const distance = relative(root, realpathSync(target));
if (!distance || (!distance.startsWith(`..${sep}`) && distance !== ".." && !isAbsolute(distance))) {
  console.error("Backups must be outside the repository, including symlink targets.");
  process.exit(1);
}

const directory = mkdtempSync(join(realpathSync(target), `pai-${scope.slice(2)}-${new Date().toISOString().slice(0, 10)}-`));
const output = join(directory, "database.sql");
try {
  execFileSync(process.execPath, [join(root, "node_modules/wrangler/bin/wrangler.js"), "d1", "export", "pai-platform", scope, `--output=${output}`], { cwd: root, stdio: "inherit" });
  console.log(`D1 export saved to ${output}`);
  console.log("Back up private R2 objects separately; this export contains database data only.");
} catch {
  console.error(`Export failed. Inspect ${directory} before using or removing any partial output.`);
  process.exitCode = 1;
}
