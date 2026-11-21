// No import circles among the app's own files (MEMORY 28): two files importing each other can read
// a value before it exists, and the app stops at load. Value imports only (`import type` never runs).
//   node scripts/check-no-import-circles.mjs .
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { posix } from "node:path";

const repo = process.argv[2];
const files = execSync("git ls-files app src", { cwd: repo, encoding: "utf8" }).split("\n").filter((f) => /\.(tsx?)$/.test(f) && !f.includes(".check."));
const set = new Set(files);
const resolve = (from, spec) => {
  const base = posix.normalize(posix.join(posix.dirname(from), spec)).replace(/\.(tsx?)$/, "");
  for (const e of [".tsx", ".ts", "/index.tsx", "/index.ts"]) if (set.has(base + e)) return base + e;
  return null;
};
const graph = new Map();
for (const f of files) {
  const src = readFileSync(posix.join(repo, f), "utf8");
  const deps = new Set();
  for (const m of src.matchAll(/^\s*(import|export)\s+(?!type\b)([^;]*?)\s+from\s+["'](\.[^"']+)["']/gms)) {
    const what = m[2].trim();
    if (/^\{[^}]*\}$/.test(what) && what.slice(1, -1).split(",").every((s) => /^\s*type\s/.test(s) || !s.trim())) continue; // { type A, type B }
    const to = resolve(f, m[3]);
    if (to) deps.add(to);
  }
  graph.set(f, [...deps]);
}
// Tarjan's strongly connected components.
let i = 0; const idx = new Map(), low = new Map(), on = new Set(), st = [], sccs = [];
const visit = (v) => {
  idx.set(v, i); low.set(v, i); i++; st.push(v); on.add(v);
  for (const w of graph.get(v) ?? []) {
    if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
    else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
  }
  if (low.get(v) === idx.get(v)) { const c = []; let w; do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) sccs.push(c); }
};
for (const f of files) if (!idx.has(f)) visit(f);
console.log(sccs.length ? `  x ${sccs.length} import circles:` : `  ✓ no import circles in ${files.length} files`);
for (const c of sccs) console.log("    " + c.join("  <->  "));
process.exit(sccs.length ? 1 : 0);
