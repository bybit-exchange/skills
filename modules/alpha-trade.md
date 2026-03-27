# Module: Alpha Trade (On-chain)

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Alpha On-chain Trading

User might say: "Buy a meme coin", "Swap USDT for SOL token", "Sell my on-chain tokens", "Check my on-chain assets", "What's the price of this token"

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

### Get Tradable Token List

```
POST /v5/alpha/trade/biz-token-list
{"tokenTag":0}
```

Rate limit: 5/s (UID), 5000/s global.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| tokenTag | integer | N | `0` all (default), `1` new token sniping, `2` on-chain hot token |

**Response** per token: `tokenCode`(DEX_id), `chainCode`, `tokenAddress`, `symbol`, `riskFlag`(0=safe, 1=risk), `minOrderQuantity`, `maxOrderQuantity`, `payTokenCodes[]`(supported CEX payment tokens), `tokenTags[]`.

> If `riskFlag=1`, warn user before trading.

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
