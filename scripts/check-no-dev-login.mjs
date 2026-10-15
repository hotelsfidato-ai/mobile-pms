#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   NO TEST SIGN-IN IN A BUILT APP — the PMS's scripts/check-no-dev-login.mjs,
   for the phone's bundles.

   The development sign-in (src/core/SignIn.tsx, src/core/api.ts) names a
   test person in the x-dev-staff-id header, with no password. It must
   exist in a development run and nowhere else. `__DEV__` is false in an
   exported (release) bundle, so the minifier drops it; this proves it did,
   on the actual output — Hermes bytecode (.hbc) or JavaScript — and fails
   if any trace reached it. The live API refuses the header on its own too.

   Usage:  node scripts/check-no-dev-login.mjs <expo export folder>
   ══════════════════════════════════════════════════════════════════ */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/* Strings only the test sign-in uses: the header, and every test person of
   the web's src/lib/devIdentities.ts. */
const MARKERS = [
  "x-dev-staff-id", "dev-owner", "dev-gm", "dev-desk", "dev-admin", "dev-hotel-manager", "dev-revenue",
  "dev-housekeeping", "dev-stores", "dev-kitchen", "dev-chef", "dev-finance",
];

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error(`  x check-no-dev-login: no export folder "${dir ?? ""}" to check`);
  process.exit(1);
}

const walk = (d) => readdirSync(d).flatMap((name) => {
  const p = join(d, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const files = walk(dir).filter((f) => /\.(hbc|js|json|map)$/.test(f));
if (!files.some((f) => /\.(hbc|js)$/.test(f))) {
  /* An empty folder passes every search: a check that cannot fail is not a check. */
  console.error(`  x check-no-dev-login: ${dir} has no bundle to check`);
  process.exit(1);
}

/* latin1 reads bytecode byte for byte, so its ASCII string table is searchable. */
const found = files.flatMap((f) => {
  const text = readFileSync(f, "latin1");
  return MARKERS.filter((m) => text.includes(m)).map((m) => `${relative(dir, f)}  contains  "${m}"`);
});

if (found.length) {
  console.error(`  x THE TEST SIGN-IN IS IN THIS BUILD. Refusing:\n    ${found.join("\n    ")}`);
  process.exit(1);
}
console.log(`  ✓ no test sign-in in ${dir} (${files.length} files checked)`);
