# OAuth Authorization Flow

This module handles one-click OAuth authorization for Bybit accounts. After authorization completes, the obtained credentials are automatically used by the Runtime Decision logic (Step 3) for all subsequent trading operations.

## Trigger

This flow is activated when:
- The user asks to connect/authorize/login to Bybit, or when calling Bybit API and no valid credentials are found
- The user's message contains "Authorize via OAuth through {{domain}}"

If the user's message matches the pattern:

> Authorize via OAuth through {{domain}} to create an AI account, and generate a public/private key pair for secure authentication and transaction signing.

Extract `{{domain}}` and map it to the `--env` parameter:

| domain | --env |
|--------|-------|
| `www.bybit.com` | mainnet |
| `testnet.bybit.com` | testnet |
| `www.unify-test-3.bybit.com` | unify-test-3 |

Then proceed with the flow below using the resolved env.

## OAuth Host Mapping

All OAuth endpoints use the following base URLs based on `resolved_env`:

| env | Base URL |
|-----|----------|
| mainnet | `https://api2.bybit.com` |
| testnet | `https://api2-testnet.bybit.com` |
| unify-test-3 | `https://api2.unify-test-3.bybit.com` |

Endpoint paths:
- Token exchange: `POST <base>/oauth/v1/public/access_token`
- Token refresh: `POST <base>/oauth/v1/public/refresh_token`
- AI accounts: `GET <base>/oauth/v1/resource/restrict/ai_accounts`

## OAuth Step 1: Check existing authorization

Get the credential file path:
```bash
export CRED_PATH=$(node -e "console.log(require('<skill_dir>/modules/oauth.js').getCredentialPath())")
```

Read the file at that path. If it exists and the token has not expired (`Math.floor(Date.now()/1000) - created_at < expires_in`), use it directly — no re-authorization needed.

If a token exists but `ai-account` credentials are missing, skip to OAuth Step 6.

## OAuth Step 2: Start callback server (background)

The server writes output to a user-private directory (`~/.bybit/` on Unix, `%APPDATA%\bybit\` on Windows) with restricted permissions (0600). Get the output path from the server's init file after startup.

Start the server:
```bash
node <skill_dir>/modules/oauth.js --port 9876 --env <resolved_env>
```

Run with `run_in_background`. The script auto-adapts to all platforms (macOS/Linux/Windows). If the port is occupied, it automatically tries the next available one. Timeout: 5 minutes (auto-exits if no callback received).

The script outputs a JSON line to stdout immediately on startup containing `authorize_url`, `output_file`, `credential_path`, `port`, and `state`. Parse this stdout to get the authorization URL and the exact path where the callback result will be written (`output_file`).

## OAuth Step 3: Display authorization link and poll for callback (atomic — do NOT end turn)

Read the init file. Extract `output_file` to know where to poll. First output the authorization link to the user:

```
[<ENV>] Please click the following link to authorize your Bybit account:

<authorize_url from init file>
```

Then **immediately** (in the same turn, do NOT end your response) run the polling command to wait for the callback.

**macOS/Linux:**
```bash
OAUTH_OUTPUT="<output_file from init file>"
for i in $(seq 1 60); do
  if [ -f "$OAUTH_OUTPUT" ] && node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));if(!d.code)process.exit(1)" "$OAUTH_OUTPUT" 2>/dev/null; then
    echo '{"status":"ok"}'
    exit 0
  fi
  sleep 5
done
echo '{"error":"timeout"}'
```

**Windows (PowerShell):**
```powershell
$OAUTH_OUTPUT = "<output_file from init file>"
for ($i = 1; $i -le 60; $i++) {
  if (Test-Path $OAUTH_OUTPUT) {
    $data = Get-Content $OAUTH_OUTPUT -Raw | ConvertFrom-Json
    if ($data.code) { Write-Output '{"status":"ok"}'; exit 0 }
  }
  Start-Sleep -Seconds 5
}
Write-Output '{"error":"timeout"}'
```

**Do NOT end your turn before running this poll command. The link output and the poll must happen in the same turn.** The user will click the link while the poll is running.

The link already contains the `code_challenge` and `code_challenge_method=S256` parameters for PKCE verification.

## OAuth Step 4: Process callback result

Once the polling command returns, parse the result:

- If `{"error": "timeout"}`: tell the user authorization timed out, offer to retry
- If `{"status": "ok"}`: proceed to OAuth Step 5 (exchange token immediately)

The server validates state internally — if state mismatched, the callback file will contain `{error: "state_mismatch"}` (no code field), and the poll will continue until timeout. If this happens, abort with an error.

After validation, proceed to Step 5 (exchange token) immediately. After token exchange, continue to Step 6 to fetch accounts, then ALWAYS display the selection UI and wait for user input before proceeding to Step 7.

## OAuth Step 5: Exchange code for token

⚠️ **Authorization codes expire in 10 minutes and are single-use. Execute this step IMMEDIATELY after receiving the code — do NOT add any intermediate steps, thinking, or delays.**

⚠️ **Secret Redaction Hazard (applies to ALL steps)**: Do NOT write raw token values, `code`, or `code_verifier` inline in shell commands. AI assistant runtime environments automatically redact secrets in command text. **Always read secrets from file at runtime** using `$(node -e "...")` command substitution.

**Preferred method — use the module directly:**
```bash
node <skill_dir>/modules/oauth.js --exchange "$OAUTH_OUTPUT" --env <resolved_env>
```

This handles token exchange + saves credentials atomically. If it outputs `needs_sub_account_selection: true`, proceed to Step 6.

**Alternative — manual curl (if module unavailable):**

```bash
export CRED_PATH=$(node -e "console.log(require('<skill_dir>/modules/oauth.js').getCredentialPath())")
mkdir -p "$(dirname "$CRED_PATH")"

CODE=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.code)" "$OAUTH_OUTPUT")
CV=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.code_verifier)" "$OAUTH_OUTPUT")

curl -s -X POST '<base_url>/oauth/v1/public/access_token' \
  -d 'client_id=ai-agent' \
  -d "code=$CODE" \
  -d "code_verifier=$CV" \
  | node -e "
    const fs=require('fs');
    let buf='';
    process.stdin.on('data',c=>buf+=c);
    process.stdin.on('end',()=>{
      const resp=JSON.parse(buf);
      if(resp.retCode!==undefined&&resp.retCode!==0){console.log(JSON.stringify({error:resp.retMsg,retCode:resp.retCode}));process.exit(1)}
      const t=resp.result||resp;
      t.created_at=Math.floor(Date.now()/1000);
      t.env='<resolved_env>';
      t.expires_in=t.expires_in||86400;
      t.refresh_token_expires_in=t.refresh_token_expires_in||2592000;
      t.token_type=t.token_type||'bearer';
      fs.writeFileSync(process.env.CRED_PATH,JSON.stringify(t,null,2),{mode:0o600});
      console.log(JSON.stringify({success:true,step:'token_saved',credential_path:process.env.CRED_PATH}));
    })"
```

```powershell
# Windows:
$env:CRED_PATH = node -e "console.log(require('<skill_dir>/modules/oauth.js').getCredentialPath())"

$CODE = node -e "const d=JSON.parse(require('fs').readFileSync('$OAUTH_OUTPUT','utf8'));process.stdout.write(d.code)"
$CV = node -e "const d=JSON.parse(require('fs').readFileSync('$OAUTH_OUTPUT','utf8'));process.stdout.write(d.code_verifier)"

curl.exe -s -X POST '<base_url>/oauth/v1/public/access_token' `
  -d "client_id=ai-agent" `
  -d "code=$CODE" `
  -d "code_verifier=$CV" `
  | node -e "
    const fs=require('fs');
    let buf='';
    process.stdin.on('data',c=>buf+=c);
    process.stdin.on('end',()=>{
      const resp=JSON.parse(buf);
      if(resp.retCode!==undefined&&resp.retCode!==0){console.log(JSON.stringify({error:resp.retMsg,retCode:resp.retCode}));process.exit(1)}
      const t=resp.result||resp;
      t.created_at=Math.floor(Date.now()/1000);
      t.env='<resolved_env>';
      t.expires_in=t.expires_in||86400;
      t.refresh_token_expires_in=t.refresh_token_expires_in||2592000;
      t.token_type=t.token_type||'bearer';
      fs.writeFileSync(process.env.CRED_PATH,JSON.stringify(t,null,2),{mode:0o600});
      console.log(JSON.stringify({success:true,step:'token_saved',credential_path:process.env.CRED_PATH}));
    })"
```

⚠️ **Do NOT add `grant_type`, `redirect_uri`, or any other parameters** — the server only needs `client_id`, `code`, `code_verifier`.

**Error handling:**
- `retCode=0`: success, token saved. Proceed to Step 6.
- `retCode=10001` (code expired/used): restart from OAuth Step 2 — do NOT retry with the same code.
- `retCode=10003`: invalid client_id.
- Other: display `retMsg`, offer to retry from Step 2.

## OAuth Step 6: Fetch AI sub-account credentials

⚠️ **CRITICAL — Secret Redaction Hazard**: Do NOT write `ACCESS_TOKEN="eyJ..."` or any raw token value inline in shell commands. **Always read secrets from file at runtime** using `$(node -e "...")` command substitution.

```bash
ACCESS_TOKEN=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.env.CRED_PATH,'utf8'));process.stdout.write(d.access_token)")
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  '<base_url>/oauth/v1/resource/restrict/ai_accounts'
```

**Response handling** (note: this endpoint may return errors as `retCode`/`retMsg` or `ret_code`/`ret_msg` — check both):
- **`retCode`/`ret_code` !== 0 (error)**: Display the error message to the user:
  ```
  ❌ Failed to fetch AI sub-accounts: <retMsg> (retCode: <retCode>)
  ```
  Common errors:
  - `ret_code=20039`: display "Please bind 2FA before proceeding." and **STOP the entire OAuth flow**. Do NOT retry, do NOT proceed to Step 7. This is a terminal error.
  - `retCode=33004`: token expired — refresh token first (see "OAuth: Refresh token"), then retry.
  - `retCode=401` or `retCode=10001`: unauthorized — token may be invalid, re-authenticate from Step 2.
  - Other: display `retMsg`/`ret_msg` verbatim and ask user how to proceed.
- ⚠️ **MANDATORY — NO EXCEPTIONS:** When the endpoint returns accounts (including an empty list), you **MUST** display the selection list and **wait for user input**. **NEVER** auto-select an account. **NEVER** auto-create an account. **NEVER** skip to Step 7 without the user's explicit choice — not even if there is only 1 account, not even if the list is empty and "create" is the only option.
  - ❌ WRONG: "Only one account, using it directly" (auto-selecting)
  - ❌ WRONG: "No sub-accounts, creating automatically" (auto-creating)
  - ✅ CORRECT: show numbered list + "Create new AI sub-account" option → wait for user reply
  
  After user selects, re-fetch with `sub_member_id` to get credentials:
  ```bash
  ACCESS_TOKEN=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.env.CRED_PATH,'utf8'));process.stdout.write(d.access_token)")
  curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    '<base_url>/oauth/v1/resource/restrict/ai_accounts?sub_member_id=<selected_id>'
  ```

  Or via module: `node <skill_dir>/modules/oauth.js --exchange "$OAUTH_OUTPUT" --env <resolved_env> --sub-member-id <selected_id>`

**Create new AI sub-account** (only when accounts.length < 5):
```bash
ACCESS_TOKEN=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.env.CRED_PATH,'utf8'));process.stdout.write(d.access_token)")
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  '<base_url>/oauth/v1/resource/restrict/ai_accounts?is_create=true'
```
Or via module: `node <skill_dir>/modules/oauth.js --exchange "$OAUTH_OUTPUT" --env <resolved_env> --is-create`

**Multiple sub-account selection UI** (render in the language of the user's most recent message):

```
You have multiple AI sub-accounts. Please choose which one to use:

1. MyBot-Trading (123456)
2. AlphaStrategy (789012)
3. TestAccount (345678)
4. ➕ Create new AI sub-account

Which one?
```

The "Create new AI sub-account" option is shown **only when accounts.length < 5**.

## OAuth Step 7: Save API credentials

Save `api_key` and `api_secret` from the response into the credential file under `ai-account`:

```bash
node -e "
  const fs=require('fs');
  const cred=JSON.parse(fs.readFileSync(process.env.CRED_PATH,'utf8'));
  const aiResp=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
  const acct=Array.isArray(aiResp.result)?aiResp.result[0]:aiResp.result;
  if(!acct||!acct.api_key){console.log(JSON.stringify({error:'no api_key in response'}));process.exit(1)}
  cred['ai-account']={sub_member_id:acct.sub_member_id,api_key:acct.api_key,api_secret:acct.api_secret};
  fs.writeFileSync(process.env.CRED_PATH,JSON.stringify(cred,null,2),{mode:0o600});
  console.log(JSON.stringify({success:true,step:'complete',sub_member_id:acct.sub_member_id,api_key_masked:acct.api_key.slice(0,5)+'...'+acct.api_key.slice(-4)}));
" /tmp/ai_response.json
```

**Preferred — use `--exchange` for Step 5+6+7 combined** (skips token exchange if credential file already has a valid token):

```bash
node <skill_dir>/modules/oauth.js --exchange "$OAUTH_OUTPUT" --env <resolved_env> --sub-member-id <selected_id>
```

**`--exchange` output when AI accounts fetch fails:** If the JSON output contains `ai_account_error`, display the error to the user and suggest refreshing the token or retrying.

## OAuth Step 8: Notify user

Output ONLY this — nothing else:
```
[<ENV>] Bybit authorization successful.
AI sub-account: <sub_member_id>
API Key: <first 5 chars>...<last 4 chars>
Credentials saved to: <credential_path>
```

⚠️ **STOP HERE. The OAuth flow is COMPLETE after this output.** Do NOT:
- Generate RSA key pairs (OAuth provides HMAC credentials directly)
- Show `.env` configuration suggestions
- Run connection verification automatically
- Do anything else unless the user asks

RSA key generation is ONLY for the manual "Path A" flow (AI Subaccount created via Bybit app). It has NOTHING to do with OAuth.

**Display rules** (never show full credentials):
- API Key: show first 5 + last 4 characters (e.g., `AbCdE...x1y2`)
- API Secret: show last 5 only (e.g., `***...vWxYz`)
- access_token / refresh_token: never display

## OAuth: Refresh token

**When to refresh:** Before any API call, check if access_token is expired: `Math.floor(Date.now()/1000) - created_at >= expires_in`.

**When refresh_token itself is expired** (`Math.floor(Date.now()/1000) - created_at >= refresh_token_expires_in`): the refresh_token cannot be used. Re-run the full OAuth flow from OAuth Step 2.

To refresh, use the base URL for the stored env. **Always read the refresh_token from the credential file** (never inline it):

```bash
REFRESH_TOKEN=$(node -e "const f=require('fs');const d=JSON.parse(f.readFileSync(process.env.CRED_PATH,'utf8'));process.stdout.write(d.refresh_token)")
curl -s -X POST '<base_url>/oauth/v1/public/refresh_token' \
  -d 'client_id=ai-agent' \
  -d "refresh_token=$REFRESH_TOKEN" \
  | node -e "
    const fs=require('fs');
    let buf='';
    process.stdin.on('data',c=>buf+=c);
    process.stdin.on('end',()=>{
      const resp=JSON.parse(buf);
      if(resp.retCode!==undefined&&resp.retCode!==0){console.log(JSON.stringify({error:resp.retMsg,retCode:resp.retCode}));process.exit(1)}
      const t=resp.result||resp;
      const cred=JSON.parse(fs.readFileSync(process.env.CRED_PATH,'utf8'));
      cred.access_token=t.access_token;
      cred.refresh_token=t.refresh_token;
      cred.created_at=Math.floor(Date.now()/1000);
      cred.expires_in=t.expires_in||cred.expires_in||86400;
      cred.refresh_token_expires_in=t.refresh_token_expires_in||cred.refresh_token_expires_in||2592000;
      fs.writeFileSync(process.env.CRED_PATH,JSON.stringify(cred,null,2),{mode:0o600});
      console.log(JSON.stringify({success:true,step:'token_refreshed'}));
    })"
```

```powershell
# Windows:
$REFRESH_TOKEN = node -e "const f=require('fs');const d=JSON.parse(f.readFileSync($env:CRED_PATH,'utf8'));process.stdout.write(d.refresh_token)"
curl.exe -s -X POST '<base_url>/oauth/v1/public/refresh_token' `
  -d "client_id=ai-agent" `
  -d "refresh_token=$REFRESH_TOKEN" `
  | node -e "
    const fs=require('fs');
    let buf='';
    process.stdin.on('data',c=>buf+=c);
    process.stdin.on('end',()=>{
      const resp=JSON.parse(buf);
      if(resp.retCode!==undefined&&resp.retCode!==0){console.log(JSON.stringify({error:resp.retMsg,retCode:resp.retCode}));process.exit(1)}
      const t=resp.result||resp;
      const cred=JSON.parse(fs.readFileSync(process.env.CRED_PATH,'utf8'));
      cred.access_token=t.access_token;
      cred.refresh_token=t.refresh_token;
      cred.created_at=Math.floor(Date.now()/1000);
      cred.expires_in=t.expires_in||cred.expires_in||86400;
      cred.refresh_token_expires_in=t.refresh_token_expires_in||cred.refresh_token_expires_in||2592000;
      fs.writeFileSync(process.env.CRED_PATH,JSON.stringify(cred,null,2),{mode:0o600});
      console.log(JSON.stringify({success:true,step:'token_refreshed'}));
    })"
```

**Error handling:**
- `retCode=0`: success, credential file updated
- `retCode=10001/10004`: refresh_token invalid or expired — re-run full OAuth flow from OAuth Step 2
- Network failure: retry once after 2 seconds, then inform user

## OAuth: Switch AI sub-account

If the user wants to switch sub-accounts, carry out the same flow as **OAuth Step 6 and Step 7** with the existing access_token (refresh first if expired). All error handling rules from Step 6 apply identically — including the `ret_code=20039` terminal rule, `retCode=33004` refresh-then-retry, `retCode=401/10001` re-auth, and the MANDATORY no-auto-select rule.

## OAuth: Credential location

The credential file path is determined automatically by the script (cross-platform). Other modules/skills can get it via:

```bash
node -e "console.log(require('<skill_dir>/modules/oauth.js').getCredentialPath())"
```

File contents include:
- `access_token` — for calling OAuth-protected endpoints
- `ai-account.api_key` + `ai-account.api_secret` — for calling Bybit Open API directly (used by Runtime Decision in Step 3)
