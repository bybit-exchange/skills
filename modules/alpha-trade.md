# Module: Alpha Trade (On-chain)

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Alpha On-chain Trading

User might say: "Buy a meme coin", "Swap USDT for SOL token", "Sell my on-chain tokens", "Check my on-chain assets", "What's the price of this token", "View the list of tradable on-chain tokens", "Query the on-chain token list", "Which tokens are available for on-chain trading"

> Alpha Trade enables **on-chain token trading** (DEX) through Bybit's unified account. Uses a **quote-then-execute** model: get a quote first, confirm with user, then execute. Settlement is on-chain (10-60s). Token codes use `CEX_<id>` for payment tokens (USDT, USDC) and `DEX_<id>` for on-chain tokens. **KYC required.**

---

## Workflow

```
1. Resolve tokens → getBizTokenList / getPayTokenList
2. Get quote     → POST /v5/alpha/trade/quote
3. Show quote to user → display price, fees, slippage
4. User confirms → execute
5. Execute trade → POST /v5/alpha/trade/purchase (buy) or /redeem (sell)
6. Track status  → POST /v5/alpha/trade/order-list (poll until status != 1)
```

> **IMPORTANT**: Never skip the quote step. Never fabricate `quoteData` or `correctingCode`. Always display quote details and get user confirmation before executing.

---

## Token Discovery & Info

### Get Tradable Token List (View tradable on-chain token list)

> **When the user says "view tradable on-chain token list", "which tokens are available for trading", or "on-chain token list", this endpoint must be called.**
> **The correct endpoint is `POST /v5/alpha/trade/biz-token-list` — do not use any other endpoint.**

```
POST /v5/alpha/trade/biz-token-list
{"tokenTag":0}
```

Rate limit: 5/s (UID), 5000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| tokenTag | integer | N | `0` all (default), `1` new token sniping, `2` on-chain hot token |

**Response** per token: `tokenCode`(DEX_id), `chainCode`, `tokenAddress`, `symbol`, `riskFlag`(0=safe, 1=risk), `minOrderQuantity`, `maxOrderQuantity`, `payTokenCodes[]`(supported CEX payment tokens), `tokenTags[]`.

> **Risk flag note**: Each token contains a `riskFlag` field. If `riskFlag=1`, a risk warning must be displayed to the user before proceeding. When displaying the token list, the `riskFlag` risk status of each token must be indicated.

### Get Token Details

```
POST /v5/alpha/trade/biz-token-details
{"chainCode":"SOL","tokenAddress":"So11111111111111111111111111111111111111112"}
```

Rate limit: 5/s (UID), 5000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| chainCode | string | Y | Blockchain code (ETH, SOL, BSC, BASE, TRX, etc.) |
| tokenAddress | string | Y | Token contract address |

**Response**: `tokenCode`, `symbol`, `tokenDesc`, `xUrl`(Twitter), `officialUrl`, `whitePaperUrl`, `riskFlag`, `status`(0=Not listed, 1=Listed, 2=Delisting, 3=In delivery, 4=Delisted), `maxPositionQuantity`, `showMessage`, `content`.

> If `showMessage=1`, display `content` notification to user.

### Get Token Prices (batch)

```
POST /v5/alpha/trade/biz-token-price-list
{"tokenAddressInfo":[{"chainCode":"SOL","tokenAddress":"..."}]}
```

Rate limit: 5/s (UID), 5000/s global. Max **20 tokens** per request.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| tokenAddressInfo | array | Y | Array of `{chainCode, tokenAddress}`. Max 20 |

**Response** per token: `price`(USD), `change24h`, `vol24h`, `marketCap`, `liquidity`, `holders`.

### Get Payment Token List

```
POST /v5/alpha/trade/pay-token-list
{"chainCode":"SOL","tokenAddress":"..."}
```

Rate limit: 5/s (UID), 5000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| chainCode | string | Y | Blockchain code |
| tokenAddress | string | Y | Target token contract address |

**Response** per token: `tokenCode`(CEX_id), `symbol`(e.g. USDT), `limit`(min amount), `supportChains[]`.

> Call this to resolve user input like "USDT" to the proper `CEX_<id>` code.

---

## User Assets

### Get Asset List

```
POST /v5/alpha/trade/asset-list
{}
```

Rate limit: 3/s (UID), 2000/s global. Empty body.

**Response**: `totalAssetUsd`, `assetList[]` — each with `tokenCode`, `chainCode`, `tokenAddress`, `tokenSymbol`, `tokenAmount`, `tokenAmountUsd`, `tradeFlag`(0=not tradable, 1=tradable), `pnl`, `pnlRatio`, `costPrice`, `lastPrice`, `assetStatus`(0=Running, 1=Delisting soon, 2=Delisted).

### Get Asset Detail

```
POST /v5/alpha/trade/asset-detail
{"chainCode":"SOL","tokenAddress":"..."}
```

Rate limit: 3/s (UID), 2000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| chainCode | string | Y | Blockchain code |
| tokenAddress | string | Y | Token contract address |

**Response**: Single asset in `assetList[]` (same fields as Get Asset List). Empty array = user doesn't hold this token.

---

## Quote & Execute

### Get Quote (MANDATORY before trade)

```
POST /v5/alpha/trade/quote
{"tradeType":1,"fromTokenCode":"CEX_1","fromTokenAmount":"100","toTokenCode":"DEX_123","quoteMode":0}
```

Rate limit: 3/s (UID), 1000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| tradeType | integer | Y | `1` purchase (buy), `2` redeem (sell) |
| fromTokenCode | string | Y | Source token code. Buy: `CEX_<id>`, Sell: `DEX_<id>` |
| fromTokenAmount | string | Y | Amount to pay (positive decimal string) |
| toTokenCode | string | Y | Target token code. Buy: `DEX_<id>`, Sell: `CEX_<id>` |
| quoteMode | integer | N | `0` auto (default), `1` price priority, `2` success rate priority |

**Response**: `toTokenAmount`, `minToTokenAmount`, `slippage`, `gas`, `gasUsd`, `platformFee`, `platformFeeUsd`, `swapRate`, `lossRate`, `quoteData`(base64), `correctingCode`(MD5), `quoteMode`, `quoteDataId`, `expireTime`, `modeEstimations[]`.

> **MUST display** to user: expected amount, fees, slippage, exchange rate. Quote expires at `expireTime` — re-fetch if expired. Pass `quoteData`, `correctingCode`, `gas` as-is to execution endpoint.

### Execute Purchase (Buy)

```
POST /v5/alpha/trade/purchase
{"fromTokenCode":"CEX_1","fromTokenAmount":"100","toTokenCode":"DEX_123","slippage":"0.01","quoteData":"...","gas":"...","quoteMode":0,"correctingCode":"..."}
```

Rate limit: 1/s (UID), 2000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| fromTokenCode | string | Y | CEX payment token code (must match quote) |
| fromTokenAmount | string | Y | Payment amount (must match quote) |
| toTokenCode | string | Y | DEX target token code (must match quote) |
| slippage | string | Y | Slippage tolerance: `0.005`=0.5%, `0.01`=1%, `0.05`=5% |
| quoteData | string | Y | From quote response (pass as-is) |
| gas | string | Y | From quote response (pass as-is) |
| quoteMode | integer | Y | `0` auto, `1` price priority, `2` success rate priority |
| correctingCode | string | Y | From quote response (pass as-is) |

**Response**: `orderNo` — use to track in order list. Response is **ACK only** (order accepted, not settled).

### Execute Redeem (Sell)

```
POST /v5/alpha/trade/redeem
{"fromTokenCode":"DEX_123","fromTokenAmount":"1000","toTokenCode":"CEX_1","slippage":"0.01","quoteData":"...","gas":"...","quoteMode":0,"correctingCode":"..."}
```

Rate limit: 1/s (UID), 2000/s global. Same params as purchase but directions reversed.

### Get Order List

```
POST /v5/alpha/trade/order-list
{"tradeType":0,"limit":20,"pageIndex":1}
```

Rate limit: 3/s (UID), 2000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| tradeType | integer | N | `0` all (default), `1` purchase, `2` redeem |
| tokenCode | string | N | Filter by token code |
| orderStatus | array | N | Filter: `[1]`=Processing, `[2]`=Success, `[3]`=Failed |
| days | integer | N | Last N days (0-90, default 90) |
| limit | integer | N | 1-100, default 20 |
| pageIndex | integer | N | Page number (1-based) |

**Response** per order: `orderNo`, `orderType`(1=Market, 2=Limit), `tradeType`(1=Purchase, 2=Redeem), `orderStatus`(1=Processing, 2=Success, 3=Failed), `fromTokenCode`, `fromTokenAmount`, `toTokenCode`, `toTokenAmount`, `gasUsd`, `platformFeeUsd`, `swapRate`, `createTime`, `executionTime`, `failureReasonCode`.

> Order status flow: `1` (Processing) → `2` (Success) or `3` (Failed). On-chain confirmation: 10-60s.

---

## Scenario: Alpha LP / Farm (Liquidity Pools)

User might say: "stake to LP pool", "add liquidity to ETH-USDC pool", "redeem LP position", "withdraw from pool", "view LP positions", "LP order history"

> Provide liquidity to Alpha on-chain pools, earn rewards. Same token-code convention (`CEX_<id>` payment, `DEX_<id>` token). All endpoints **POST**. KYC required, write-permission API key. Stake/redeem are async — 200 response is ACK only; poll `position-list` or `order-list` to confirm. On-chain confirmation typically 10-60s.

**⚠️ Mandatory Stake flow**

> 1. `POST /v5/alpha/lp/pool-list` → discover pools (filter by `tokenSymbol`)
> 2. `POST /v5/alpha/lp/pool-info` → get full pool details (APY, fee rate, reserves, price range)
> 3. `POST /v5/alpha/lp/pay-token-list` → verify available balance, get `tokenCode`
> 4. **Confirm with user**: pool, stake amount, range, expected APY
> 5. `POST /v5/alpha/lp/stake` → returns `positionId` + `orderNo`
> 6. Poll `POST /v5/alpha/lp/position-list` and `/order-list` until `orderStatus=2` (Success)

**⚠️ Mandatory Redeem flow**

> 1. `POST /v5/alpha/lp/position-list` → get `positionId` and current value
> 2. **Confirm with user**: position, reduction ratio (`dercRatio`)
> 3. `POST /v5/alpha/lp/redeem` → returns `orderNo`
> 4. Poll `/order-list` until `orderStatus=2` (Success)

### Pool Discovery

```
POST /v5/alpha/lp/pool-list  {"tokenSymbol":"ETH"}
POST /v5/alpha/lp/pool-info  {"poolAddress":"0x..."}
POST /v5/alpha/lp/pay-token-list  {}
POST /v5/alpha/lp/pay-token-price  {"tokenCode":["CEX_1","CEX_2"],"chainCode":"ETH"}
```

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Pool List | `/v5/alpha/lp/pool-list` | POST | — | tokenSymbol |
| Pool Info | `/v5/alpha/lp/pool-info` | POST | poolAddress | — |
| Pay Token List | `/v5/alpha/lp/pay-token-list` | POST | — | chainCode, tokenAddress |
| Pay Token Price | `/v5/alpha/lp/pay-token-price` | POST | tokenCode | chainCode |

> `pay-token-price`: `tokenCode` is an array (1–50 tokens) for batch query. `pay-token-list`: returns user's `availableBalance` per token. Rate limits: 5/s UID, 5000/s global on all four.

### Stake / Redeem

```
POST /v5/alpha/lp/stake
{"positionId":0,"poolAddress":"0x...","payTokenAmount":"1000","payTokenCode":"CEX_1","rangeUpper":"2000","rangeLower":"1800"}
```

> `positionId=0` → create new position; non-zero → add to existing. Either `rangeUpper`/`rangeLower` (range order) **or** `priceUpper`/`priceLower` (price-priority order) — not both. Rate: 1/s UID, 2000/s global.

```
POST /v5/alpha/lp/redeem
{"positionId":12345,"poolAddress":"0x...","dercRatio":"0.5"}
```

> `dercRatio`: `0`–`1`. `"0.5"` = redeem 50%, `"1"` = close entire position. Rate: 1/s UID, 2000/s global.

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Stake | `/v5/alpha/lp/stake` | POST | positionId, poolAddress, payTokenAmount, payTokenCode | rangeUpper, rangeLower, priceUpper, priceLower |
| Redeem | `/v5/alpha/lp/redeem` | POST | positionId, poolAddress, dercRatio | receiveTokenCode |
| Position List | `/v5/alpha/lp/position-list` | POST | — | — |
| Order List | `/v5/alpha/lp/order-list` | POST | — | orderType, tokenCode, orderStatus, days, limit, pageIndex, poolAddress |

### Track Status

```
POST /v5/alpha/lp/position-list  {}
POST /v5/alpha/lp/order-list  {"orderType":1,"days":7,"limit":20,"pageIndex":1}
```

> **Position status**: `1` Active · `2` Closed · `3` Processing.
> **Order status**: `1` Processing · `2` Success · `3` Failed (`failureReason` populated).
> **Order type filter**: `0` All (default) · `1` Stake · `2` Redeem.
> `days`: 0–365 (default 90). `limit`: 1–100 (default 20). `pageIndex`: 1-based (default 1).
> Position-list rate: 3/s UID. Order-list rate: 3/s UID.

### LP Error Codes (180xxx)

| Code | Meaning |
|------|---------|
| 180000 | Internal server error |
| 180001 | Invalid request parameter |
| 180002 | Token not supported |
| 180003 | Position not found (redeem) |
| 180004 | Amount precision exceeds limit |
| 180006 | Amount below minimum |
| 180007 | Amount exceeds maximum |
| 180100 | Service temporarily unavailable |
| 180104 | Wallet balance insufficient |
| 180200 | Request conflict |

---

## Scenario: Alpha Prediction Markets

User might say: "bet on Argentina winning the World Cup", "buy YES on the FIFA final", "sell my prediction shares", "view my prediction positions", "what's the price of the YES token", "show my prediction P&L", "which prediction markets are live", "how much can I win"

> Alpha Prediction Markets let users trade **YES/NO outcome shares** on real-world events (Phase 1: sports, e.g. FIFA 2026). Prices are probabilities in `[0, 1]` — a price of `0.65` means the market implies a 65% chance of that outcome. Winning shares settle to **1 USDC** each; losing shares settle to `0`. All trading is **USDC-only** on Polygon (Phase 1). All endpoints **POST** except `engine-status`, `pay-token-list`, and `sports/timeline-stages` (GET). KYC + geo-eligibility required — US and sanctioned regions are blocked.

> **Testnet caveat.** Prediction is a Phase 1 mainnet product; testnet coverage is unverified. If a Prediction endpoint returns `404` / permission errors on `BYBIT_ENV=testnet`, don't retry — tell the user Prediction may not be available on testnet and suggest switching to mainnet. Do NOT preemptively block the call.

> **Handling HTTP 403 (geo-restriction / trade ban):** buy/sell endpoints return `403` when the user's region is blocked or on-chain trading is banned. On `403`, do NOT retry. Tell the user: "This feature is not available in your region. Refer to Bybit's official announcements for the current list of restricted regions." and stop the flow.

**Prediction-specific enums (from `common/enums.yaml`):**

- `PredictionSide` (integer): `1` YES (buy/hold YES outcome) · `2` NO (buy/hold NO outcome). Also used as trade direction: `1` BUY, `2` SELL in order-estimate/order-list.
- `PredictionOrderType` (integer): `1` FOK (Fill or Kill) — Phase 1 only; fully filled or entirely cancelled.
- `PredictionOrderStatus` (integer): `1` PENDING · `2` FILLED · `3` PARTIALLY_FILLED · `4` CANCELLED · `5` REJECTED.
- `PredictionPositionResult` (integer): `1` WIN (market resolved in favour) · `2` LOSE (resolved against) · `3` MANUAL_CLOSE (sold before resolution).
- `PredictionMatchStatus` (integer): `1` Live · `2` Upcoming · `3` Ended.
- `PredictionTimelineStatus` (integer): `1` Done · `2` Active · `3` Upcoming.
- `PredictionEventType` (integer): `1` FIFA_2026 (Phase 1 only value).
- `PredictionMarketType` (integer): `1` YES/NO binary · `2` Multi-outcome.
- `PredictionPriceInterval` (string): `"1H"` · `"6H"` · `"1D"` · `"1W"` · `"1M"` · `"ALL"`.
- `PredictionStageCode` (string): `"Groups"` · `"R32"` · `"R16"` · `"QF"` · `"SF"` · `"Final"`.
- `PredictionSortBy` (string): `volume` · `liquidity` · `endDate`.

**⚠️ Mandatory BUY flow**

> 1. `GET /v5/alpha/prediction/engine-status` → verify `available=true`
> 2. `POST /v5/alpha/prediction/event-detail` → get `tokenId`, current `price`, `side`
> 3. `GET /v5/alpha/prediction/pay-token-list` → confirm `USDC` is the payTokenCode
> 4. `POST /v5/alpha/prediction/order-estimate` → preview `avgPrice`, `estimatedReceive`, `toWin`, `feeAmount`
> 5. **Show estimate to user and get explicit confirmation**
> 6. `POST /v5/alpha/prediction/buy` → returns `orderNo` (ACK only)
> 7. Poll `POST /v5/alpha/prediction/order-list` until `status=2` (FILLED) or `status=4` (CANCELLED)

**⚠️ Mandatory SELL flow**

> 1. `GET /v5/alpha/prediction/engine-status` → verify `available=true`
> 2. `POST /v5/alpha/prediction/position-list` → confirm holdings & `shares` ≥ intended sell size
> 3. `POST /v5/alpha/prediction/order-estimate` (`side=2`, `amount`=shares) → preview `estimatedReceive` (USDC)
> 4. **Show estimate to user and get explicit confirmation**
> 5. `POST /v5/alpha/prediction/sell` → returns `orderNo` (ACK only)
> 6. Poll `POST /v5/alpha/prediction/order-list` until `status=2` or `4`

> **Never skip order-estimate.** Prediction orders are FOK-only in Phase 1 — a partial fill is impossible: the order is either fully filled or cancelled entirely. The estimate is the only preview the user gets.

### Market & Event Discovery

```
GET  /v5/alpha/prediction/engine-status
POST /v5/alpha/prediction/event-detail          {"slug":"will-argentina-win-world-cup-2026"}
POST /v5/alpha/prediction/side-market-list      {"eventType":1}
POST /v5/alpha/prediction/sports/match-list     {"eventType":1}
GET  /v5/alpha/prediction/sports/timeline-stages?eventType=1
POST /v5/alpha/prediction/sports/group-stage-detail  {"eventType":1,"stageCode":"Groups"}
GET  /v5/alpha/prediction/pay-token-list
```

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Engine Status | `/v5/alpha/prediction/engine-status` | GET | — | — |
| Event Detail | `/v5/alpha/prediction/event-detail` | POST | — | eventId, slug, hasMoreMarkets |
| Side Market List | `/v5/alpha/prediction/side-market-list` | POST | eventType | — |
| Sports Match List | `/v5/alpha/prediction/sports/match-list` | POST | eventType | — |
| Sports Timeline Stages | `/v5/alpha/prediction/sports/timeline-stages` | GET | — | eventType |
| Sports Group Stage Detail | `/v5/alpha/prediction/sports/group-stage-detail` | POST | eventType, stageCode | — |
| Payment Token List | `/v5/alpha/prediction/pay-token-list` | GET | — | — |

**Endpoint notes:**

- `engine-status` → `{available: boolean}`. If `available=false`, do NOT attempt buy/sell — tell the user the market is temporarily unavailable.
- `event-detail`: at least one of `eventId` or `slug` should be supplied. **When both are provided, `slug` takes priority.** `hasMoreMarkets` (default `false`) merges markets from related sub-events. Response `markets[]` contains `tokenId`, `outcome`, `price`, `side` (`PredictionSide`), `volume`, `liquidity`. `tokenId` is what feeds into all trading endpoints.
- `side-market-list`: returns auxiliary markets around a sports event (e.g., golden boot, top scorer). Not match-outcome markets. `eventType=1` = FIFA_2026.
- `sports/match-list`: returns matches with `matchStatus` (`PredictionMatchStatus`). Each match carries an `eventId` — feed it into `event-detail` to get the market's `tokenId`. Do not offer `matchStatus=3` (Ended) matches for trading unless the user explicitly asks.
- `sports/timeline-stages`: `eventType` is a query-string parameter (GET); returns each stage with `status` (`PredictionTimelineStatus`) and its `startTime`/`endTime`. Use the returned `stageCode` values with `group-stage-detail`.
- `sports/group-stage-detail`: `stageCode` MUST be one of `Groups|R32|R16|QF|SF|Final`. Returns group standings (team, played, won, drawn, lost, goalsFor, goalsAgainst, points) for group stages; knockout stages return a similar structure with fewer fields.
- `pay-token-list`: Phase 1 returns USDC only, `supportChains=["POLYGON"]`, `tokenDecimals=6`. Always call before buy to verify payment token support.

### Prices & Depth

```
POST /v5/alpha/prediction/token-price   {"tokenIds":["token_yes_123","token_no_123"]}
POST /v5/alpha/prediction/order-book    {"tokenIds":["token_yes_123"]}
POST /v5/alpha/prediction/price-history {"tokenIds":["token_yes_123"],"interval":"1D","fidelity":0}
```

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Token Price | `/v5/alpha/prediction/token-price` | POST | tokenIds | — |
| Order Book | `/v5/alpha/prediction/order-book` | POST | tokenIds | — |
| Price History | `/v5/alpha/prediction/price-history` | POST | interval | tokenIds, eventId, fidelity |

**Endpoint notes:**

- `token-price`: batch quote — **max 20 `tokenIds` per request**. Returns `price` (mid), `bestBid`, `bestAsk`, `lastTradePrice`. Price is a probability in `[0,1]`.
- `order-book`: full depth — **max 20 `tokenIds`**. Bids sorted desc by price, asks sorted asc. Use for pre-trade impact estimation on larger orders.
- `price-history`: supply **either** `tokenIds` (max 20) **or** `eventId` (all tokens in that event) — not both. `interval` is required (`PredictionPriceInterval`: `1H|6H|1D|1W|1M|ALL`). `fidelity` = minutes between data points (default `0` = system auto). Stricter rate limit: **2 req/s UID (no cache)**, 2000/s global. All other Prediction read endpoints are 5 req/s UID.

### Trading (Estimate → Buy / Sell → Order List)

```
POST /v5/alpha/prediction/order-estimate
{"tokenId":"token_yes_123","side":1,"eventId":"event_123","amount":"100","orderType":1,"payTokenCode":"USDC"}
```

```
POST /v5/alpha/prediction/buy
{"tokenId":"token_yes_123","amount":"100","payTokenCode":"USDC","orderType":1,"slippage":"0.05","eventId":"event_123"}
```

```
POST /v5/alpha/prediction/sell
{"tokenId":"token_yes_123","size":"50","orderType":1,"slippage":"0.05","eventId":"event_123","toTokenCode":"USDC"}
```

```
POST /v5/alpha/prediction/order-list
{"status":2,"side":1,"limit":20,"pageIndex":1,"days":7}
```

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Order Estimate | `/v5/alpha/prediction/order-estimate` | POST | tokenId, side, eventId, amount, orderType | payTokenCode |
| Buy | `/v5/alpha/prediction/buy` | POST | tokenId, amount, payTokenCode, orderType, slippage, eventId | — |
| Sell | `/v5/alpha/prediction/sell` | POST | tokenId, size, orderType, slippage, eventId | toTokenCode |
| Order List | `/v5/alpha/prediction/order-list` | POST | — | status, tokenId, limit, pageIndex, eventId, side, days |

**Endpoint notes:**

- `order-estimate` — MANDATORY before every buy or sell. `side=1` (BUY): `amount` is **USDC to invest**; `payTokenCode` required (`"USDC"`). `side=2` (SELL): `amount` is **number of shares to sell**; `payTokenCode` omitted. Response: `avgPrice` (per-share), `estimatedCost`, `estimatedReceive`, `toWin` (BUY only — payout if outcome resolves in favour, equals `shares × 1 USDC`), `feeAmount` (= `feeDetail.serverFee` + `feeDetail.polymarketFee`), `slippage` (echoed). **Show all of these to the user before proceeding.**
- `buy` — rate limit **1 req/s UID**, 2000/s global. `amount` is USDC (positive decimal string). `slippage="0.05"` = accept up to 5% price movement. `orderType=1` (FOK) is the only accepted value. Response `orderNo` is an ACK — the trade is not confirmed until `order-list` shows `status=2`. `403` on geo-restricted regions / trade ban.
- `sell` — rate limit **1 req/s UID**, 2000/s global. `size` is number of shares (NOT USDC). `toTokenCode` defaults to `"USDC"` in Phase 1. Same FOK + ACK semantics as buy.
- `order-list` — rate limit **3 req/s UID**, 2000/s global. All request fields are optional; body may be `{}`. `status` is `PredictionOrderStatus` (1–5). `side` is `PredictionSide` (1 BUY, 2 SELL). `days` caps at `90`. Response `pageIndex=0` in the result means no more data. `orderAmount` is USDC for BUY orders, shares for SELL orders. FOK orders will show up as `status=2` (FILLED) or `status=4` (CANCELLED) — never `3` (PARTIALLY_FILLED).

> **FOK reminder**: Because Phase 1 supports FOK only, a "no liquidity" scenario cancels the entire order; the user's USDC is not spent. Handle `retCode=700002` (insufficient liquidity for FOK) by suggesting a smaller size or higher slippage.

### Portfolio & Positions

```
POST /v5/alpha/prediction/portfolio-summary {}
POST /v5/alpha/prediction/position-list     {"limit":20,"pageIndex":1}
POST /v5/alpha/prediction/position-history  {"limit":20,"pageIndex":1}
```

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Portfolio Summary | `/v5/alpha/prediction/portfolio-summary` | POST | — | (empty body accepted) |
| Position List (open) | `/v5/alpha/prediction/position-list` | POST | — | limit, pageIndex, direction |
| Position History (closed) | `/v5/alpha/prediction/position-history` | POST | — | limit, pageIndex, direction |

**Endpoint notes:**

- `portfolio-summary` — aggregated stats only: `positionValue`, `positionValueUsd`, `biggestWin`, `winRate` (decimal ratio, e.g. `"0.67"` = 67%), `winCount`, `lossCount`. Use for a high-level overview; do NOT call per position.
- `position-list` — OPEN (unresolved) positions only. Fields: `positionId`, `tokenId`, `eventId`, `outcomeName`, `shares`, `cost`, `avgPrice`, `currentPrice`, `value`, `unrealizedPnl`, `unrealizedPnlRate`, `createdAt`, `updatedAt`, `finished`. `direction` (`prev|next`) is a cursor hint. Before selling, check that the user's `shares` on that `tokenId` covers the intended sell `size`.
- `position-history` — CLOSED positions only. Fields: `exitPrice`, `realizedPnl`, `realizedPnlRate`, `result` (`PredictionPositionResult`: `1` WIN, `2` LOSE, `3` MANUAL_CLOSE), `closedAt`. Use to summarise the user's realised performance.

### Prediction Error Codes

Standard Alpha errors `180000` / `180001` still apply (see module-wide `## Error Codes (180xxx)` table below). Prediction-specific codes are in the `700xxx` range:

| Code | Name | Meaning |
|------|------|---------|
| 700001 | PREDICTION_MARKET_NOT_FOUND | Market not found or closed |
| 700002 | PREDICTION_INSUFFICIENT_LIQUIDITY | Insufficient liquidity for FOK — order cancelled |
| 700003 | PREDICTION_ENGINE_UNAVAILABLE | Matching engine temporarily unavailable |
| 700010 | PREDICTION_INSUFFICIENT_BALANCE | User's USDC balance insufficient (buy) |
| 700011 | PREDICTION_INSUFFICIENT_POSITION | User does not hold enough shares (sell) |

> On `700003`, back off and re-check `engine-status` before retrying. On `700002`, propose lowering the amount or widening slippage rather than immediately retrying with the same params.

---

## Error Codes (180xxx)

| Code | Meaning |
|------|---------|
| 180000 | Internal server error |
| 180001 | Invalid request parameter |
| 180002 | Token not supported |
| 180003 | Payment token not found |
| 180004 | Amount precision exceeds limit |
| 180005 | fromTokenCode = toTokenCode |
| 180006 | Amount below minimum |
| 180007 | Amount exceeds maximum |
| 180008 | Slippage out of valid range |
| 180009 | No position found (sell only) |
| 180010 | Insufficient position balance (sell only) |
| 180012 | Price difference too large |
| 180013 | Transaction value below minimum (sell only) |
| 180100 | Service temporarily unavailable |
| 180101 | Token price feed unavailable |
| 180103 | Insufficient liquidity |
| 180104 | Wallet balance insufficient |
| 180200 | Request conflict (duplicate) |

---

## Notes

- All endpoints are **POST** (including queries) — this differs from standard V5 GET queries
- Token codes: `CEX_<id>` = centralized exchange tokens (USDT, USDC), `DEX_<id>` = on-chain tokens
- Always call **getTradeQuote** before purchase/redeem — the `quoteData` and `correctingCode` are required and cannot be fabricated
- Quotes have an **expiration time** (`expireTime`) — re-fetch if expired
- Trade execution is **asynchronous** — poll order-list to confirm final status
- `correctingCode` is MD5 of `(quoteData + fromTokenCode + fromTokenAmount + toTokenCode)` for tamper protection
- Idempotent via `quoteDataId` — duplicate submissions return the same order
- Uses standard V5 response format (`retCode`/`retMsg`)
- **Querying the tradable on-chain token list must use `POST /v5/alpha/trade/biz-token-list`** — each token in the response contains a `riskFlag` field (0=safe, 1=risk); the risk status must be indicated when displaying the list
