#!/usr/bin/env node
/**
 * Type-check gate for the pre-commit hook.
 *
 * Runs `tsc --noEmit` but tolerates the handful of "Cannot find module" errors
 * for OPTIONAL native/heavy deps that aren't always installed in a local dev
 * env (OneDrive corruption, optional features) yet DO exist in CI/Docker. Any
 * other TypeScript error — including a real error inside those same files — is
 * surfaced and blocks the commit.
 *
 * In CI/Docker the optional modules resolve, so nothing is filtered (0 ignored,
 * 0 total) and the gate behaves as a plain `tsc --noEmit`.
 *
 * Note: assumes the Prisma client is generated. Run `npm run db:generate` once
 * after schema changes (here `npx prisma` doesn't resolve — see package.json).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const OPTIONAL_MODULES = ["diff2html", "@xterm/xterm", "@xterm/addon-fit", "bullmq", "e2b"];

const tscBin = path.join("node_modules", "typescript", "bin", "tsc");
const res = spawnSync(process.execPath, [tscBin, "--noEmit"], {
  encoding: "utf8",
  cwd: process.cwd(),
});

const output = `${res.stdout || ""}${res.stderr || ""}`;
const lines = output.split(/\r?\n/);

const realErrors = lines.filter((line) => {
  if (!/error TS/.test(line)) return false;
  const m = line.match(/Cannot find module '([^']+)'/);
  if (m && OPTIONAL_MODULES.includes(m[1])) return false; // tolerate optional-dep imports only
  return true;
});

if (realErrors.length > 0) {
  console.error(output.trim());
  console.error(`\n✗ typecheck failed: ${realErrors.length} TypeScript error(s). Commit blocked.`);
  process.exit(1);
}

console.log("✓ typecheck passed (optional-dep import errors ignored).");
