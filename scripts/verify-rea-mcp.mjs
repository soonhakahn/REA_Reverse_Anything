#!/usr/bin/env node
// Launches the REA MCP server exactly as .mcp.json configures it, then makes a real
// tools/call against a synthetic HAR. Exit code 0 means REA is callable from this machine.
//   node scripts/verify-rea-mcp.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = "inspect_web_network_capture";
const SECRET = "demo-secret-token-123";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
};

// rea-agents package.json "engines": ^22.19.0 || ^24.11.0 || >=26.0.0
const nodeSupported = (version) => {
  const [major, minor] = version.split(".").map(Number);
  return (major === 22 && minor >= 19) || (major === 24 && minor >= 11) || major >= 26;
};

const header = (name, value) => ({ name, value });
const entry = (method, url, status, body) => ({
  startedDateTime: "2026-01-01T00:00:00.000Z",
  time: 10,
  request: {
    method,
    url,
    httpVersion: "HTTP/1.1",
    cookies: [],
    headers: [header("Authorization", `Bearer ${SECRET}`)],
    queryString: [],
    headersSize: -1,
    bodySize: 0,
  },
  response: {
    status,
    statusText: "OK",
    httpVersion: "HTTP/1.1",
    cookies: [],
    headers: [header("Content-Type", "application/json")],
    content: { size: body.length, mimeType: "application/json", text: body },
    redirectURL: "",
    headersSize: -1,
    bodySize: body.length,
  },
  cache: {},
  timings: { send: 1, wait: 8, receive: 1 },
});
const syntheticHar = {
  log: {
    version: "1.2",
    creator: { name: "verify-rea-mcp", version: "1" },
    entries: [
      entry("GET", "https://api.example.test/v1/users/123", 200, '{"id":123}'),
      entry("POST", "https://api.example.test/v1/orders", 201, '{"order_id":"550e8400-e29b-41d4-a716-446655440000"}'),
      entry("GET", "https://api.example.test/v1/orders/550e8400-e29b-41d4-a716-446655440000", 200, '{"status":"paid"}'),
    ],
  },
};

// Minimal MCP stdio client: newline-delimited JSON-RPC 2.0.
function startServer({ command, args = [], env = {} }) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const pending = new Map();
  let nextId = 1;
  let stderr = "";
  let buffer = "";

  const failAll = (error) => {
    for (const waiter of pending.values()) waiter.reject(error);
    pending.clear();
  };
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-4000);
  });
  child.on("error", (error) => failAll(new Error(`cannot start "${command}": ${error.message}`)));
  child.on("exit", (code, signal) => failAll(new Error(`server exited early (${code ?? signal})\n${stderr}`)));
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    for (let end = buffer.indexOf("\n"); end !== -1; end = buffer.indexOf("\n")) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (message.id === undefined) continue;
      if (message.method) {
        // Server-to-client request (e.g. ping): acknowledge so the server never blocks.
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} })}\n`);
        continue;
      }
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(JSON.stringify(message.error)));
      else waiter?.resolve(message.result);
    }
  });

  const request = (method, params, timeoutMs = 60000) =>
    new Promise((resolvePromise, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`timeout after ${timeoutMs} ms waiting for ${method}\n${stderr}`));
      }, timeoutMs);
      pending.set(id, {
        resolve: (value) => (clearTimeout(timer), resolvePromise(value)),
        reject: (error) => (clearTimeout(timer), reject(error)),
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  const notify = (method) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method })}\n`);
  const stop = () => {
    child.stdin.end();
    setTimeout(() => child.kill(), 1000).unref();
  };
  return { request, notify, stop };
}

const workDir = mkdtempSync(join(tmpdir(), "rea-verify-"));
let server;
try {
  const config = JSON.parse(readFileSync(join(root, ".mcp.json"), "utf8"));
  const spec = config.mcpServers?.rea;
  if (!spec?.command) throw new Error('.mcp.json has no "rea" server; see README.md');
  console.log(`INFO  rea server command: ${spec.command} ${(spec.args ?? []).join(" ")}`);
  check(`Node.js ${process.versions.node} satisfies REA engines`, nodeSupported(process.versions.node), "needs ^22.19 || ^24.11 || >=26");

  server = startServer(spec);
  const startedAt = Date.now();
  // The first run downloads rea-agents through npx, so allow a generous startup window.
  const init = await server.request(
    "initialize",
    { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "verify-rea-mcp", version: "1.0.0" } },
    150000,
  );
  server.notify("notifications/initialized");
  check("initialize handshake", init.serverInfo?.name === "rea", `${init.serverInfo?.name} ${init.serverInfo?.version} in ${Date.now() - startedAt} ms`);

  const tools = [];
  let cursor;
  do {
    const page = await server.request("tools/list", cursor ? { cursor } : {});
    tools.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);
  check("tools/list", tools.some((tool) => tool.name === TOOL), `${tools.length} tools, includes ${TOOL}`);

  const harPath = join(workDir, "synthetic.har");
  writeFileSync(harPath, JSON.stringify(syntheticHar));
  const result = await server.request("tools/call", { name: TOOL, arguments: { capture_path: harPath, format: "har" } });
  const text = (result.content ?? []).map((part) => part.text ?? "").join("");
  let totalRecords;
  try {
    totalRecords = JSON.parse(text).normalized_result?.total_records;
  } catch {
    // Reported by the check below.
  }
  check(`tools/call ${TOOL}`, !result.isError && totalRecords === 3, `total_records=${totalRecords}`);
  // Only meaningful when the call above really returned REA evidence.
  const evaluated = totalRecords === 3;
  check("Authorization header excluded from evidence", evaluated && !text.includes(SECRET), evaluated ? "" : "not evaluated: tools/call failed");
} catch (error) {
  failures += 1;
  console.log(`FAIL  ${error.message}`);
} finally {
  server?.stop();
  rmSync(workDir, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nREA MCP is callable." : `\n${failures} check(s) failed.`);
setTimeout(() => process.exit(failures === 0 ? 0 : 1), 1200);
