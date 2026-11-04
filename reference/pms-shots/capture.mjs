// Every PMS screen at phone width: a full-length picture and its words.
// Headless Chrome, its own profile, no package (Node's WebSocket, the DevTools protocol).
// Reads the private website (5190, from .claude/worktrees/pms-ref) on the private API (8870, fidato_ref).
//   node capture.mjs <list.json> <out folder>
// list: [{ name, to, as?: "dev-gm", steps?: [{click:"text"} | {label:"aria label"} | {wait:ms}] }]
//   `to` omitted: carries on from the page as it stands (a flow, a dialog open).
//   BASE=http://localhost:<your Expo port> shoots YOUR native screens the same way, side by side.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [listFile, out] = process.argv.slice(2);
const list = JSON.parse(readFileSync(listFile, "utf8"));
mkdirSync(out, { recursive: true });

/* Each run its own port and profile, so several can run at once. */
const PORT = 9400 + (process.pid % 500), BASE = process.env.BASE ?? "http://localhost:5190", W = 390, H = 844;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=D:\\fidato pms moblie\\.local\\pms-shots\\chrome-profile-${PORT}`,
  "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars", "--mute-audio", "about:blank",
], { stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 60 && !target; i++) {
  await wait(500);
  try {
    const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = tabs.find((t) => t.type === "page");
  } catch { /* not up yet */ }
}
if (!target) { chrome.kill(); throw new Error("Chrome did not start"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, x) => { ws.onopen = r; ws.onerror = () => x(new Error("no DevTools connection")); setTimeout(() => x(new Error("no DevTools connection in 15 s")), 15000); });
let id = 0;
const pending = new Map();
/* Requests in flight, so a picture waits for the page's reads (the live stream never ends). */
const flying = new Set();
let lastNet = Date.now();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === "Network.requestWillBeSent" && !/\/live(\?|$)|\/@vite|hot-update/.test(d.params.request.url)) { flying.add(d.params.requestId); lastNet = Date.now(); }
  if (d.method === "Network.loadingFinished" || d.method === "Network.loadingFailed") { if (flying.delete(d.params.requestId)) lastNet = Date.now(); }
};
const settled = async (quiet = 1500, most = 40000) => {
  const start = Date.now();
  while (Date.now() - start < most && (flying.size > 0 || Date.now() - lastNet < quiet)) await new Promise((r) => setTimeout(r, 150));
};
const cdp = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
  const n = ++id;
  const timer = setTimeout(() => { pending.delete(n); rej(new Error(`${method}: no answer in ${ms / 1000} s`)); }, ms);
  pending.set(n, (d) => { clearTimeout(timer); return d.error ? rej(new Error(`${method}: ${d.error.message}`)) : res(d.result); });
  ws.send(JSON.stringify({ id: n, method, params }));
});
const js = async (expression) => {
  const r = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return r.result?.value;
};
const metrics = (height) => cdp("Emulation.setDeviceMetricsOverride", { width: W, height, deviceScaleFactor: 2, mobile: true });

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Network.enable");
/* The website's analytics never leave from here. */
await cdp("Network.setBlockedURLs", { urls: ["*google-analytics.com*", "*googletagmanager.com*", "*google.com/g/collect*"] });
await metrics(H);
await cdp("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" });

let who = null, script = null;
const signIn = async (uid) => {
  if (who === uid) return;
  if (script) await cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier: script }).catch(() => {});
  script = (await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `try { sessionStorage.setItem("fidato.dev-subject", ${JSON.stringify(uid)}); } catch {}` })).identifier;
  await cdp("Page.navigate", { url: `${BASE}/` }, 180000);
  await wait(1500);
  who = uid;
};

const press = (needle, byLabel) => js(`(() => {
  const all = [...document.querySelectorAll('button,a,[role=button],[role=tab],[role=menuitem]')].filter((b) => b.offsetParent !== null);
  const b = all.find((e) => ${byLabel ? `(e.getAttribute('aria-label') || '').startsWith(${JSON.stringify(needle)})` : `e.innerText.trim().startsWith(${JSON.stringify(needle)})`});
  if (!b) return false; b.click(); return true; })()`);

const done = [];
for (const s of list) {
  const row = { name: s.name, to: s.to, as: s.as ?? "dev-gm" };
  try {
    await signIn(row.as);
    await metrics(H);
    if (s.to) await cdp("Page.navigate", { url: `${BASE}${s.to}` }, 180000);
    /* Ready: words on the page and no "Loading" left, or 12 s. */
    for (let i = 0; i < 180; i++) {
      await wait(500);
      if (await js(`document.body.innerText.trim().length > 60 && !/^\\s*(Loading|Checking your session)/.test(document.body.innerText)`)) break;
    }
    await settled();
    for (const step of s.steps ?? []) {
      if (step.wait) await wait(step.wait);
      if (step.click) { row.pressed = await press(step.click, false); await wait(300); await settled(800); }
      if (step.label) { row.pressed = await press(step.label, true); await wait(300); await settled(800); }
    }
    row.path = await js("location.pathname + location.search");
    row.title = await js(`(document.querySelector('[role=dialog] h1,[role=dialog] h2,h1') || {}).innerText || ''`);
    /* The app scrolls inner panels: draw the page as tall as its tallest panel. */
    const tall = await js(`Math.min(9000, Math.max(document.documentElement.scrollHeight, ...[...document.querySelectorAll('main,div,section,[role=dialog]')].filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollHeight + e.getBoundingClientRect().top)))`);
    row.height = Math.max(H, Math.ceil(tall ?? H));
    await metrics(row.height);
    await wait(500);
    const shot = await cdp("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, `${s.name}.png`), Buffer.from(shot.data, "base64"));
    writeFileSync(join(out, `${s.name}.txt`), (await js("document.body.innerText")) ?? "");
    row.ok = true;
  } catch (e) {
    row.ok = false; row.error = String(e.message ?? e);
  }
  done.push(row);
  console.log(`${row.ok ? "ok " : "x  "} ${row.name}  ${row.path ?? ""}  ${row.title ? `"${String(row.title).slice(0, 40)}"` : ""} ${row.height ?? ""}${row.error ? " " + row.error : ""}`);
}
writeFileSync(join(out, "index.json"), JSON.stringify(done, null, 1));
ws.close();
await wait(200);
chrome.kill();
