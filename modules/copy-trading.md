# Module: Copy Trading

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required for bind endpoints; leaderboards are public.

## Scenario: Copy Trading

User might say: "Find me a good copy trader", "Follow this leader with 100 USDT", "What symbols support copy trading?", "Check my copy trading positions"

---

## Leader Discovery

### Copy Trading Classic — Recommend Leaderboard

```
GET /v5/copy-trade/recommend-leader-list
```

Returns a curated ranked list (max 5) of Copy Trading Classic leaders. Preserve the returned order when presenting to the user. Response fields per leader:

| Field | Description |
|-------|-------------|
| `leaderMark` | Exact leader identifier (use for bind request) |
| `nickname` | Display name |
| `thirtyDayRoi` | 30-day ROI (string, e.g. "18.42%") |
| `thirtyDayMaxDrawdown` | 30-day max drawdown |
| `thirtyDaySharpeRatio` | 30-day Sharpe ratio |

### Copy Trading TradFi — Recommend Leaderboard

```
GET /v5/copy-mt5/recommend-provider-list
```

Returns a curated ranked list (max 5) of Copy Trading TradFi providers. Response fields per provider:

| Field | Description |
|-------|-------------|
| `providerMark` | Exact provider identifier (use for bind request) |
| `nickname` | Display name |
| `thirtyDayRoe` | 30-day ROE (string) |
| `thirtyDayMaxDrawdown` | 30-day max drawdown |
| `thirtyDaySharpeRatio` | 30-day Sharpe ratio |

> **Discovery workflow**: When user asks for a copy trader, call BOTH leaderboard endpoints. Present as two numbered lists (`Classic 1..N`, `TradFi 1..N`) showing 30-day return, max drawdown, and Sharpe ratio side by side. **Do NOT recommend or rank — display the data objectively and let the user decide.** Add disclaimer: "Past performance does not guarantee future results. This is not investment advice — please evaluate risk tolerance before following any trader." Let user choose by index (e.g. "Classic 1" or "TradFi 3").

---

## Follow Binding

### Copy Trading Classic — Create Follow Binding (authentication required)

```
POST /v5/copy-trade/private/follower/trade-setting/create
{"leaderMark":"A+GD996nAABdB95wg7CeuQ==","investmentE8":"10000000000"}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `leaderMark` | string | yes | Exact leader identifier from leaderboard |
| `investmentE8` | **string** | yes | Investment amount in e8 precision. `"10000000000"` = 100 USDT. Must be a **string** — different from TradFi which uses integer |

> `investmentE8` must be ≥ `100000000` (1 USDT) and divisible by `100000000` (whole USDT amounts only). Uses UTA account balance. Do NOT infer `leaderMark` from nickname — must come from leaderboard API.

**Response** (on success):

| Field | Description |
|-------|-------------|
| `errSymbols` | Array of symbols that failed to set up (may be empty on full success) |
| `setLeverageType` | Leverage setting type applied |
| `setLeverageErrorCode` | Error code for leverage setting (0 = no error) |

> Check `errSymbols` — if non-empty, some symbols failed to configure. Inform the user which symbols had issues.

**After successful bind**, show success message with link (URL-encode `leaderMark` in the URL since it may contain `+`, `=`, `/`):
- Mainnet: `https://www.bybit.com/copyTrade/trade-center/followLeaderDetail?leaderMark=<URL-encoded leaderMark>`
- Testnet: `https://testnet.bybit.com/copyTrade/trade-center/followLeaderDetail?leaderMark=<URL-encoded leaderMark>`

### Copy Trading TradFi — Create Follow Binding (authentication required)

```
POST /v5/copy-mt5/private/follower/trade-setting/create
{"providerMark":"C8rbL07mPa/rQbfXtGAWMg==","investmentE8":30000000000}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `providerMark` | string | yes | Exact provider identifier from leaderboard |
| `investmentE8` | **integer** | yes | Investment amount in e8 precision. `30000000000` = 300 USDT. Must be an **integer** — different from Classic which uses string |

> Same constraints as Classic: ≥ 1 USDT, whole-number amounts. Uses funding account balance.

**After successful bind**, show success message with link (URL-encode `providerMark` in the URL since it may contain `+`, `=`, `/`):
- Mainnet: `https://www.bybit.com/copyMt5/followLeaderDetail?type=current&providerMark=<URL-encoded providerMark>`
- Testnet: `https://testnet.bybit.com/copyMt5/followLeaderDetail?type=current&providerMark=<URL-encoded providerMark>`

---

## Error Codes

### Classic Bind Errors

| Code | Error |
|------|-------|
| 10001 | Parameter error |
| 10016 | Server error |
| 12001 | Leader trading mode not supported |
| 12021 | Already following max leaders |
| 12045 | Copy trading not activated |
| 12046 | Leader not found or not active |
| 12047 | Investment amount invalid |
| 12048 | Insufficient balance (UTA account) |
| 12049 | Risk limit exceeded |
| 12050 | Already following this leader |
| 12051 | Copy trading restricted for this account |
| 12052 | Leader's follower capacity full |
| 12054 | Leader suspended |
| 12068 | System maintenance |
| 12077 | Leader closed to new followers |
| 12102 | Account type not supported (need UTA) |
| 39408 | Duplicate request |

### TradFi Bind Errors

| Code | Error |
|------|-------|
| 10001 | Parameter error |
| 10016 | Server error |
| 12068 | System maintenance |
| 12101 | Account type not supported |
| 12803 | Provider not found or not active |
| 12804 | Already following this provider |
| 12805 | Provider's follower capacity full |
| 12806 | Investment amount invalid |
| 12807 | Insufficient balance (funding account) |
| 12808 | Already following max providers |
| 12809 | Copy trading not activated |
| 12810 | Provider suspended |
| 12811 | Copy trading restricted for this account |
| 12812 | Provider closed to new followers |
| 12813 | Risk limit exceeded |
| 12814 | Funding account locked |
| 12815 | Provider trading mode not supported |
| 12816 | Region restriction |
| 39415 | Duplicate request |

---

## Trading as Copy Trading Leader

Copy trading leaders use the standard Trade and Position endpoints with `category=linear`. Refer to the **derivatives** module for the full Trade and Position API tables.

**Check which symbols support copy trading**
```
GET /v5/market/instruments-info?category=linear
```
> In the response, check the `copyTrading` field — symbols with `"normalOnly"` do not support copy trading; those with `"both"` or `"copyTradingOnly"` are eligible.

**Place a copy trading order (as leader)**
```
POST /v5/order/create
{"category":"linear","symbol":"BTCUSDT","side":"Buy","orderType":"Limit","qty":"0.1","price":"29000","timeInForce":"GTC","positionIdx":1}
```
> Copy trading accounts can only trade USDT Perpetual symbols. API Key must have "Contract - Orders & Positions" permission.

**View copy trading positions**
```
GET /v5/position/list?category=linear
```

**Close a copy trading position**
```
POST /v5/order/create
{"category":"linear","symbol":"BTCUSDT","side":"Sell","orderType":"Market","qty":"0","reduceOnly":true,"positionIdx":1}
```

---

## API Reference

| Endpoint | Path | Method | Auth | Key Params |
|----------|------|--------|------|-----------|
| Classic Leaderboard | `/v5/copy-trade/recommend-leader-list` | GET | No | — |
| TradFi Leaderboard | `/v5/copy-mt5/recommend-provider-list` | GET | No | — |
| Classic Follow Bind | `/v5/copy-trade/private/follower/trade-setting/create` | POST | Yes | leaderMark, investmentE8(string) |
| TradFi Follow Bind | `/v5/copy-mt5/private/follower/trade-setting/create` | POST | Yes | providerMark, investmentE8(integer) |
| Check Symbol Eligibility | `/v5/market/instruments-info` | GET | No | category=linear, check `copyTrading` field |
| Place Order | `/v5/order/create` | POST | Yes | category=linear, positionIdx required |
| View Positions | `/v5/position/list` | GET | Yes | category=linear |
| Close Position | `/v5/order/create` | POST | Yes | reduceOnly=true |
| Order History | `/v5/order/history` | GET | Yes | category=linear |

## Notes

- Copy trading accounts are always in **hedge mode** — `positionIdx` is required (1=long, 2=short)
- Only USDT Perpetual symbols are supported
- API Key needs "Contract - Orders & Positions" permission
- Classic uses `leaderMark` (string); TradFi uses `providerMark` (string) — never confuse
- Classic `investmentE8` is a string; TradFi `investmentE8` is an integer — match the type exactly
- `leaderMark`/`providerMark` values contain Base64 characters (`+`, `=`, `/`) — URL-encode them when building links
- Classic bind uses UTA account; TradFi bind uses funding account — check respective balances before binding
- On Classic bind success, check `errSymbols` in response for any symbols that failed to configure
