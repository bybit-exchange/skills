#!/usr/bin/env node
/**
 * Bybit OAuth callback server with PKCE (S256) + atomic token exchange.
 * No client_secret required — uses code_verifier/code_challenge instead.
 * Cross-platform: supports macOS, Linux, and Windows via Node.js.
 *
 * Usage:
 *   node oauth.js --port 9876 --env unify-test-3
 *   node oauth.js --exchange /tmp/oauth_callback.json --env mainnet
 *   node oauth.js --exchange /tmp/oauth_callback.json --env mainnet --sub-member-id 123456
 *   node oauth.js --exchange /tmp/oauth_callback.json --env mainnet --is-create
 */

const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");

const CLIENT_ID = "ai-agent";

const HOSTS = {
  mainnet: {
    authorize: "https://www.bybit.com/oauth",
    api_base: "https://api2.bybit.com",
    token: "https://api2.bybit.com/oauth/v1/public/access_token",
    refresh: "https://api2.bybit.com/oauth/v1/public/refresh_token",
    ai_accounts: "https://api2.bybit.com/oauth/v1/resource/restrict/ai_accounts",
  },
  testnet: {
    authorize: "https://testnet.bybit.com/oauth",
    api_base: "https://api2-testnet.bybit.com",
    token: "https://api2-testnet.bybit.com/oauth/v1/public/access_token",
    refresh: "https://api2-testnet.bybit.com/oauth/v1/public/refresh_token",
    ai_accounts: "https://api2-testnet.bybit.com/oauth/v1/resource/restrict/ai_accounts",
  },
  "unify-test-3": {
    authorize: "https://www.unify-test-3.bybit.com/zh-MY/oauth",
    api_base: "https://api2.unify-test-3.bybit.com",
    token: "https://api2.unify-test-3.bybit.com/oauth/v1/public/access_token",
    refresh: "https://api2.unify-test-3.bybit.com/oauth/v1/public/refresh_token",
    ai_accounts: "https://api2.unify-test-3.bybit.com/oauth/v1/resource/restrict/ai_accounts",
  },
};

function getCredentialPath() {
  if (process.platform === "win32") {
    const base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(base, "bybit", "oauth_token.json");
  }
  return path.join(os.homedir(), ".bybit", "oauth_token.json");
}

function getDefaultOutputPath() {
  const suffix = `_${process.pid}`;
  if (process.platform === "win32") {
    const base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(base, "bybit", `oauth_callback${suffix}.json`);
  }
  return path.join(os.homedir(), ".bybit", `oauth_callback${suffix}.json`);
}

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function findAvailablePort(start, end) {
  return new Promise((resolve, reject) => {
    function tryPort(port) {
      if (port > end) {
        reject(new Error(`No available port in range ${start}-${end}`));
        return;
      }
      const srv = net.createServer();
      srv.once("error", () => tryPort(port + 1));
      srv.once("listening", () => {
        srv.close(() => resolve(port));
      });
      srv.listen(port, "127.0.0.1");
    }
    tryPort(start);
  });
}

function httpPost(urlStr, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const postData = typeof body === "string" ? body : new URLSearchParams(body).toString();
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "bybit-skill-oauth/1.0",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error("Invalid JSON response from OAuth server")); }
      });
    });
    req.setTimeout(30000, () => { req.destroy(new Error("Request timeout after 30s")); });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function httpGet(urlStr, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: { "User-Agent": "bybit-skill-oauth/1.0", ...(headers || {}) },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error("Invalid JSON response from OAuth server")); }
      });
    });
    req.setTimeout(30000, () => { req.destroy(new Error("Request timeout after 30s")); });
    req.on("error", reject);
    req.end();
  });
}

function maskKey(key) {
  if (!key || key.length < 9) return "***";
  return key.slice(0, 5) + "..." + key.slice(-4);
}

async function exchangeAndSave(args) {
  const callbackFile = args.exchange;
  const host = HOSTS[args.env];
  const credPath = getCredentialPath();

  // Try to reuse existing valid token (for sub-account selection flow)
  let credential = null;
  if (fs.existsSync(credPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(credPath, "utf8"));
      const now = Math.floor(Date.now() / 1000);
      if (existing.access_token && existing.env === args.env &&
          (now - existing.created_at) < existing.expires_in) {
        credential = existing;
      }
    } catch (e) { /* ignore parse errors, will re-exchange */ }
  }

  // If no valid token, exchange the code
  if (!credential) {
    if (!fs.existsSync(callbackFile)) {
      process.stdout.write(JSON.stringify({ success: false, error: "callback_file_not_found", message: `File not found: ${callbackFile}` }) + "\n");
      process.exit(1);
    }

    const callback = JSON.parse(fs.readFileSync(callbackFile, "utf8"));
    if (!callback.code || !callback.code_verifier) {
      process.stdout.write(JSON.stringify({ success: false, error: "invalid_callback", message: "Missing code or code_verifier in callback file" }) + "\n");
      process.exit(1);
    }

    const tokenResp = await httpPost(host.token, {
      client_id: CLIENT_ID,
      code: callback.code,
      code_verifier: callback.code_verifier,
    });
    if (!tokenResp || (tokenResp.retCode !== undefined && tokenResp.retCode !== 0 && !tokenResp.access_token)) {
      process.stdout.write(JSON.stringify({
        success: false,
        error: "token_exchange_failed",
        retCode: tokenResp?.retCode,
        retMsg: tokenResp?.retMsg || "Unknown error",
      }) + "\n");
      process.exit(1);
    }

    const tokenData = tokenResp.result || tokenResp;
    credential = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || "bearer",
      expires_in: tokenData.expires_in || 86400,
      refresh_token_expires_in: tokenData.refresh_token_expires_in || 2592000,
      env: args.env,
      created_at: Math.floor(Date.now() / 1000),
    };

    fs.mkdirSync(path.dirname(credPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(credPath, JSON.stringify(credential, null, 2), { mode: 0o600 });
    try { fs.unlinkSync(callbackFile); } catch (e) { /* best-effort cleanup */ }
  }

  // Step 2: Get AI sub-account credentials
  let aiAccountUrl = host.ai_accounts;
  const params = [];
  if (args.subMemberId) {
    params.push(`sub_member_id=${args.subMemberId}`);
  }
  if (args.isCreate) {
    params.push("is_create=true");
  }
  if (params.length) {
    aiAccountUrl += `?${params.join("&")}`;
  }

  const aiResp = await httpGet(aiAccountUrl, {
    Authorization: `Bearer ${credential.access_token}`,
  });

  const aiRetCode = aiResp?.retCode ?? aiResp?.ret_code;
  const aiRetMsg = aiResp?.retMsg ?? aiResp?.ret_msg;
  if (!aiResp || (aiRetCode !== undefined && aiRetCode !== 0)) {
    const isTerminal = aiRetCode === 20039;
    process.stdout.write(JSON.stringify({
      success: !isTerminal,
      step: isTerminal ? "terminal_error" : "token_saved",
      ai_account_error: aiRetMsg || "Failed to fetch AI accounts",
      ai_account_retCode: aiRetCode,
      credential_path: credPath,
      needs_sub_account_selection: false,
    }) + "\n");
    process.exit(isTerminal ? 1 : 0);
  }

  const aiResult = aiResp.result || aiResp;

  // Always prompt selection when accounts are returned as a list (including empty list)
  const accountList = Array.isArray(aiResult) ? aiResult : (aiResult?.accounts ? aiResult.accounts : null);
  if (Array.isArray(accountList)) {
    const accounts = accountList.map((a) => ({
      sub_member_id: a.sub_member_id,
      nickname: a.nickname || "",
    }));
    process.stdout.write(JSON.stringify({
      success: true,
      step: "token_saved",
      needs_sub_account_selection: true,
      accounts: accounts,
      can_create: accounts.length < 5,
      credential_path: credPath,
    }) + "\n");
    process.exit(0);
  }

  // Specific sub_member_id selected (or non-array response) — has credentials
  const aiAccount = aiResult;
  if (aiAccount && aiAccount.api_key) {
    credential["ai-account"] = {
      sub_member_id: aiAccount.sub_member_id,
      api_key: aiAccount.api_key,
      api_secret: aiAccount.api_secret,
    };
    fs.writeFileSync(credPath, JSON.stringify(credential, null, 2), { mode: 0o600 });
    process.stdout.write(JSON.stringify({
      success: true,
      step: "complete",
      credential_path: credPath,
      sub_member_id: aiAccount.sub_member_id,
      api_key_masked: maskKey(aiAccount.api_key),
    }) + "\n");
  } else {
    process.stdout.write(JSON.stringify({
      success: false,
      step: "ai_account_incomplete",
      ai_account_error: "No api_key in response",
      credential_path: credPath,
      needs_sub_account_selection: false,
    }) + "\n");
    process.exit(1);
  }
  process.exit(0);
}

function parseArgs() {
  const args = { port: 9876, output: getDefaultOutputPath(), env: "unify-test-3", exchange: null, subMemberId: null, isCreate: false };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--port" && process.argv[i + 1]) {
      args.port = parseInt(process.argv[++i], 10);
    } else if (process.argv[i] === "--output" && process.argv[i + 1]) {
      args.output = process.argv[++i];
    } else if (process.argv[i] === "--env" && process.argv[i + 1]) {
      args.env = process.argv[++i];
    } else if (process.argv[i] === "--exchange" && process.argv[i + 1]) {
      args.exchange = process.argv[++i];
    } else if (process.argv[i] === "--sub-member-id" && process.argv[i + 1]) {
      args.subMemberId = process.argv[++i];
    } else if (process.argv[i] === "--is-create") {
      args.isCreate = true;
    }
  }
  if (!HOSTS[args.env]) {
    process.stderr.write(`Unknown env: ${args.env}. Available: ${Object.keys(HOSTS).join(", ")}\n`);
    process.exit(1);
  }
  return args;
}

async function main(args) {
  if (!args) args = parseArgs();
  const port = await findAvailablePort(args.port, args.port + 10);

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(8).toString("hex");

  const host = HOSTS[args.env];
  const authorizeUrl =
    `${host.authorize}` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=ai-account` +
    `&state=${state}` +
    `&redirect_uri=http://127.0.0.1:${port}/callback` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  const initData = {
    authorize_url: authorizeUrl,
    code_verifier: codeVerifier,
    state: state,
    port: port,
    output_file: args.output,
    credential_path: getCredentialPath(),
  };
  const initJson = JSON.stringify(initData);

  const initFile = args.output.replace(/\.json$/i, "_init.json") === args.output
    ? args.output + "_init.json"
    : args.output.replace(/\.json$/i, "_init.json");
  fs.mkdirSync(path.dirname(initFile), { recursive: true, mode: 0o700 });
  fs.writeFileSync(initFile, initJson, { mode: 0o600 });

  const { code_verifier: _cv, ...publicInitData } = initData;
  process.stdout.write(JSON.stringify(publicInitData) + "\n");

  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url, "http://127.0.0.1");

    if (parsed.pathname !== "/callback") {
      res.writeHead(404);
      res.end();
      return;
    }

    const code = parsed.searchParams.get("code");
    const returnedState = parsed.searchParams.get("state");

    if (returnedState !== state) {
      const errResult = { error: "state_mismatch" };
      fs.writeFileSync(args.output, JSON.stringify(errResult), { mode: 0o600 });
      process.stdout.write(JSON.stringify(errResult) + "\n");
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Authorization failed: state mismatch.");
    } else if (code) {
      const redirectUri = `http://127.0.0.1:${port}/callback`;
      const result = {
        code: code,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        state: state,
      };
      fs.writeFileSync(args.output, JSON.stringify(result), { mode: 0o600 });
      process.stdout.write(JSON.stringify({ status: "ok", output_file: args.output }) + "\n");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("Authorization successful! You can close this page.");
    } else {
      const errResult = { error: parsed.searchParams.get("error") || "authorization_failed" };
      fs.writeFileSync(args.output, JSON.stringify(errResult), { mode: 0o600 });
      process.stdout.write(JSON.stringify(errResult) + "\n");
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Authorization failed.");
    }

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
  });

  server.listen(port, "127.0.0.1");

  const TIMEOUT_MS = 300000;
  setTimeout(() => {
    const errResult = { error: "timeout" };
    fs.writeFileSync(args.output, JSON.stringify(errResult), { mode: 0o600 });
    process.stdout.write(JSON.stringify(errResult) + "\n");
    server.close();
    process.exit(1);
  }, TIMEOUT_MS);
}

if (require.main === module) {
  const args = parseArgs();
  const run = args.exchange ? exchangeAndSave(args) : main(args);
  run.catch((err) => {
    process.stderr.write(err.message + "\n");
    process.exit(1);
  });
}

module.exports = { getCredentialPath };
