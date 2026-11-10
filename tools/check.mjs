// Run the in-page layout check (tools/check-page.js) in a headless Chromium over the DevTools protocol.
// Usage: node tools/check.mjs [--only=ch05,ch12] [--html=index.html | --url=http://localhost:4321/claude-code-deep-dive/ja/deck/]
// Exits 1 when any slide fails or the page logs an error.
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)
      .filter((d) => d.startsWith("chromium_headless_shell"))
      .toSorted()
      .toReversed()) {
      for (const arch of readdirSync(join(cache, dir))) {
        const bin = join(cache, dir, arch, "chrome-headless-shell");
        if (existsSync(bin)) return bin;
      }
    }
  }
  for (const bin of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]) {
    if (existsSync(bin)) return bin;
  }
  throw new Error("no Chromium found; set CHROME_PATH");
}

function launch(bin) {
  const profile = mkdtempSync(join(tmpdir(), "ccdd-check-"));
  const proc = spawn(bin, [
    "--headless",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--hide-scrollbars",
    // CI runners start Chromium as root, where the sandbox is unavailable.
    ...(process.getuid?.() === 0 || process.env.CI ? ["--no-sandbox"] : []),
    "about:blank",
  ]);
  const ready = new Promise((resolve, reject) => {
    let buf = "";
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) resolve(new URL(m[1]).port);
    });
    proc.on("exit", (code) => reject(new Error(`chromium exited (${code}): ${buf.slice(-500)}`)));
  });
  return { proc, profile, ready };
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) listeners.forEach((fn) => fn(msg));
  });
  const opened = new Promise((r) => ws.addEventListener("open", r, { once: true }));
  return {
    opened,
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const n = ++id;
        pending.set(n, { resolve, reject });
        ws.send(JSON.stringify({ id: n, method, params }));
      }),
    on: (fn) => listeners.push(fn),
    close: () => ws.close(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = args.url || pathToFileURL(join(root, args.html || "index.html")).href;
  const { proc, profile, ready } = launch(findChrome());
  try {
    const port = await ready;
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((t) => t.type === "page");
    const c = cdp(page.webSocketDebuggerUrl);
    await c.opened;
    const errors = [];
    c.on((m) => {
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
        errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
      if (m.method === "Log.entryAdded" && m.params.entry.level === "error")
        errors.push(`${m.params.entry.text} ${m.params.entry.url || ""}`.trim());
    });
    await c.send("Runtime.enable");
    await c.send("Log.enable");
    await c.send("Emulation.setDeviceMetricsOverride", {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await c.send("Page.navigate", { url });
    for (let i = 0; i < 120; i++) {
      const r = await c.send("Runtime.evaluate", {
        expression: "typeof Reveal !== 'undefined' && Reveal.isReady && Reveal.isReady()",
        returnByValue: true,
      });
      if (r.result.value) break;
      await sleep(250);
    }
    const fn = readFileSync(join(root, "tools/check-page.js"), "utf8")
      .replace(/^\/\/.*$/gm, "")
      .trim()
      .replace(/;\s*$/, "");
    const r = await c.send("Runtime.evaluate", {
      expression: `(${fn})(${JSON.stringify(args.only || "")})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    const { total, failures } = r.result.value;
    c.close();
    console.log(`checked ${total} slides${args.only ? ` (only ${args.only})` : ""}`);
    for (const f of failures) console.log(`  ${f.kind.padEnd(8)} ${f.id || f.index}  ${f.detail}`);
    for (const e of errors) console.log(`  console  ${e}`);
    // A filter that matches nothing is a mistake (e.g. a file prefix instead of a slide id), not a pass.
    if (total === 0) console.log("  no slides matched; --only takes slide ids such as ch05,ch12");
    const ok = total > 0 && failures.length === 0 && errors.length === 0;
    console.log(
      ok
        ? "OK: no layout failures"
        : `FAIL: ${failures.length} layout failures, ${errors.length} console errors`,
    );
    process.exitCode = ok ? 0 : 1;
  } finally {
    const exited = new Promise((r) => proc.once("exit", r));
    proc.kill();
    await Promise.race([exited, sleep(3000)]);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
