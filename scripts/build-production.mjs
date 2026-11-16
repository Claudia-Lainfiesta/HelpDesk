import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function npm(args) {
  const result = spawnSync("npm", args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error("No se pudo completar el build de producción.");
    process.exit(result.status ?? 1);
  }
}
// --include=dev es necesario aunque Render construya con NODE_ENV=production.
npm(["--prefix", "frontend", "ci", "--include=dev", "--no-audit", "--no-fund"]);
npm(["--prefix", "backend", "ci", "--include=dev", "--no-audit", "--no-fund"]);
npm(["--prefix", "frontend", "run", "build"]);
npm(["--prefix", "frontend", "run", "verify:production"]);
rmSync(new URL("../backend/dist/", import.meta.url), {
  recursive: true,
  force: true,
});
npm(["--prefix", "backend", "run", "build"]);
