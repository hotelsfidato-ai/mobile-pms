#!/usr/bin/env bash
# THE MOBILE APP'S GATES (AGENTS.md, docs/PLAN.md § 6), judged by exit code, all
# green before a merge. Runs on the copy it sits in: mobile/ or a helper's copy.
#
#   # this PC, Git Bash, in D:\fidato pms moblie\mobile (or a helper's copy's mobile/)
#   bash scripts/gates.sh
#
# A line per step goes into ../.local/mobile-gates/progress.txt as each one ends,
# so a run in flight can be watched; the first line names the commit judged
# ("dirty" when the copy had uncommitted changes). Logs sit beside it.
# The first phone bundle after a while takes about 3 minutes on this PC.
cd "$(dirname "$0")/.." || exit 9
# Each copy its own Metro cache (MEMORY 4): the copies share node_modules,
# and through one shared cache a copy's export carried another copy's routes.
T="$(cd .. && { pwd -W 2>/dev/null || pwd; })/.local/metro-tmp"
mkdir -p "$T" && export TEMP="$T" TMP="$T"
S="../.local/mobile-gates"
mkdir -p "$S"
P="$S/progress.txt"
dirty=$(git status --porcelain -- . | head -1)
echo "commit $(git rev-parse HEAD)${dirty:+ dirty}" | tee "$P"

fail=0
step() {                       # step <name> -- <command...>
  local name="$1" log="$S/$1.log" began=$SECONDS; shift 2
  if "$@" > "$log" 2>&1; then r="ok  "; else r="FAIL"; fail=1; fi
  echo "$r $name ($((SECONDS - began)) s)" | tee -a "$P"
  [ "$r" = "FAIL" ] && tail -15 "$log"
}

checks() { for f in $(find src -name '*.check.ts'); do node --experimental-strip-types --no-warnings "$f" || return 1; done; }
# The bundle's screens are exactly this copy's app/ files (MCORE-2).
routes() {
  diff <(cd app && find . -name '*.tsx' | sort) \
    <(grep -aohE '\./[A-Za-z0-9_/().+-]*(\[[a-z]+\][A-Za-z0-9_/.-]*)*\.tsx' "$1"/_expo/static/js/*/*.hbc | sort -u) \
    && echo "  ✓ the bundle's routes are this copy's app/" \
    || { echo "  x the bundle's routes are not this copy's app/ (< app only, > bundle only)"; return 1; }
}
bundle() { npx expo export --platform "$1" --output-dir "$S/export-$1" && node scripts/check-no-dev-login.mjs "$S/export-$1" && routes "$S/export-$1"; }

step types -- npx tsc --noEmit
step checks -- checks
step android -- bundle android
step ios -- bundle ios

[ $fail = 0 ] && echo "ALL GATES GREEN" | tee -a "$P" || { echo "GATES FAILED" | tee -a "$P"; exit 1; }
