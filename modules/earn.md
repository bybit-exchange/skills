# Module: Earn

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Table of Contents

1. [Earn Products](#scenario-earn-products) — FlexibleSaving & OnChain (Stake / Redeem / Yield)
2. [Advance Earn](#scenario-advance-earn-dual-assets--smart-leverage--double-win) — Dual Assets / Smart Leverage / DoubleWin
3. [Smart Leverage](#scenario-smart-leverage-future-boost) — Leveraged structured products
4. [Liquidity Mining](#scenario-liquidity-mining) — Pool liquidity provision with leverage
5. [BYUSDT Token](#scenario-byusdt-token-earn-token) — Mint / Redeem earn token

---

## Global: Amount Precision Rules

> **⚠️ All `amount` values** must be truncated (floor, **not** rounded) to the precision returned by the product:
> - Earn Products: use `orderPrecisionDigital`
> - Liquidity Mining: use `baseCoinPrecision` / `quoteCoinPrecision`
> - BYUSDT Token: use `baseCoinPrecision` / `tokenPrecision`
>
> Before placing any order, validate that `amount` ≥ `minPurchaseAmount` (or `minInvestmentQuote`/`minInvestmentBase` for Liquidity Mining) and does not exceed `maxInvestmentAmount` / `remainingAmount`. Exceeding these bounds will cause the API to reject the request.

---

## Scenario: Earn Products

User might say: "Show me available earn products", "Deposit USDT", "Redeem"

**View product list**
```
GET /v5/earn/product?category=FlexibleSaving&coin=USDT
```
> Use the returned `productId` for place-order requests.

**Stake**
```
POST /v5/earn/place-order
{"category":"FlexibleSaving","orderType":"Stake","accountType":"UNIFIED","coin":"USDT","amount":"1000","productId":"123","orderLinkId":"unique-id-123"}
```
> All 7 params above are required. Get `productId` from the product list first.

**View orders**
```
GET /v5/earn/order?category=FlexibleSaving
```

**View yield history**
```
GET /v5/earn/yield?category=FlexibleSaving&coin=USDT
```

**Redeem**
```
POST /v5/earn/place-order
{"category":"FlexibleSaving","orderType":"Redeem","accountType":"UNIFIED","coin":"USDT","amount":"500","productId":"123","orderLinkId":"unique-id-456"}
```

### OnChain Products

> **OnChain is a separate product line from FlexibleSaving.** It uses on-chain staking with the following key differences:
> - `accountType` **must be `FUND`** (UNIFIED is not supported)
> - On-chain transactions may have **waiting times** for confirmation (not instant like FlexibleSaving)
> - API flow is identical to FlexibleSaving — just replace `category` with `OnChain`

**Stake (OnChain)**
```
POST /v5/earn/place-order
{"category":"OnChain","orderType":"Stake","accountType":"FUND","coin":"ETH","amount":"1","productId":"456","orderLinkId":"onchain-stake-001"}
```

**Redeem (OnChain)**
```
POST /v5/earn/place-order
{"category":"OnChain","orderType":"Redeem","accountType":"FUND","coin":"ETH","amount":"0.5","productId":"456","orderLinkId":"onchain-redeem-001"}
```

---

## API Reference

### Earn (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Product | `/v5/earn/product` | GET | category | coin |
| Place Order | `/v5/earn/place-order` | POST | category, orderType, accountType, coin, amount, productId, orderLinkId | redeemPositionId, toAccountType |
| Query Order | `/v5/earn/order` | GET | category | orderId, orderLinkId, productId, startTime, endTime, limit, cursor |
| Position | `/v5/earn/position` | GET | category | productId, coin |
| Yield | `/v5/earn/yield` | GET | category | productId, startTime, endTime, limit, cursor |
| Hourly Yield | `/v5/earn/hourly-yield` | GET | category | productId, startTime, endTime, limit, cursor |

> **Optional parameter notes for Place Order:**
> - `redeemPositionId`: Used when redeeming a **specific** position. Applicable when the user holds multiple positions for the same product; if omitted, the system redeems from the default position.
> - `toAccountType`: Specifies the **destination account** for redeemed funds (e.g., `FUND` or `UNIFIED`). If omitted, funds return to the same account type used during staking.

## Enums

* **orderType**: `Stake` | `Redeem`
* **accountType**: `FUND` | `UNIFIED` (OnChain only supports FUND)
* **earn category**: `FlexibleSaving` | `OnChain` | `DualAssets` (Advance Earn) | `DoubleWin` (Advance Earn) | `SmartLeverage` (Advance Earn)

### `apyE8` / `aprE8` Conversion Rule

> Fields ending in `E8` (e.g., `apyE8`, `aprE8`, `mintFeeRateE8`) represent the value **multiplied by 10⁸**.
> To convert to a human-readable percentage: **divide by 10⁸, then multiply by 100**.
> Example: `apyE8 = 855000000` → 855000000 ÷ 10⁸ = 8.55 → **APY = 8.55%**.
> **Never display raw `E8` values to the user.** Always convert first.

### `accountType` Applicability by Product

| Product / Operation | Supported `accountType` |
|---|---|
| FlexibleSaving — Stake | `FUND`, `UNIFIED` |
| FlexibleSaving — Redeem | `FUND`, `UNIFIED` |
| OnChain — Stake / Redeem | `FUND` only |
| DualAssets — Stake | `FUND`, `UNIFIED` |
| SmartLeverage — Stake / Redeem | `FUND`, `UNIFIED` |
| DoubleWin — Stake / Redeem | `FUND`, `UNIFIED` |
| Liquidity Mining | `FUND` (via `quoteAccountType` / `baseAccountType`) |
| BYUSDT Token — Mint | `FlexibleSaving` |
| BYUSDT Token — Redeem | `UNIFIED` |

---

## Scenario: Advance Earn (Dual Assets / Smart Leverage / Double Win)

User might say: "Show me dual asset products", "Stake BTC in dual assets", "Check my dual assets position", "What APY can I get on BTC sell high", "Help me join BTC dual assets", "Dual assets", "BTC dual assets", "Double win", "Show me double win products"

> Dual Assets is a **structured product** with fixed duration and settlement. Users choose a direction (**BuyLow** or **SellHigh**) and target price. If price reaches target at settlement, the trade executes; otherwise, principal + yield is returned.
>
> **⚠️ Direction selection is required**:
> - **BuyLow**: Invest USDT; if BTC price is below the strike price at expiry, BTC is purchased at the strike price. Suitable for users who want to buy BTC at a lower price.
> - **SellHigh**: Invest BTC; if BTC price is above the strike price at expiry, BTC is sold at the strike price. Suitable for users who want to sell BTC at a higher price.
>
> When the user has not specified a direction, **you must first ask the user to choose BuyLow or SellHigh** before proceeding with the remaining flow.
>
> **⚠️ Quote Expiry Warning**: Quotes expire quickly — always get fresh quotes immediately before placing orders. Never use cached or previously retrieved quotes. See Mandatory pre-order flow step 4 for full `expiredAt` handling requirements.

**⚠️ Mandatory pre-order flow**

> When a user requests to place a Dual Assets order (BuyLow or SellHigh), you **must** follow this sequence and **must mention quote expiry (`expiredAt` / expiration time) to the user**:
>
> 1. **Ask for direction**: If the user has not specified `BuyLow` or `SellHigh` (direction), ask them to choose before proceeding.
> 2. Call `GET /v5/earn/advance/product?category=DualAssets` to find the matching `productId`
> 3. Call `GET /v5/earn/advance/product-extra-info?category=DualAssets&productId=<id>` to get **real-time quotes**
> 4. **⚠️ Check `expiredAt` (quote expiration time)**: Check each quote's `expiredAt` field — **only use a quote whose `expiredAt` has not passed**. Tell the user: "Quotes have an expiration time limit. Each quote has an `expiredAt` expiration time — please confirm your order before the quote expires." Always inform the user of the `expiredAt` (expiration time) of the selected quote so they know how long the quote is valid.
> 5. Extract `selectPrice` and `apyE8` from the chosen quote and include them in the place-order request
> 6. **Confirm with user before placing order**: Present an order summary to the user and **wait for explicit confirmation** before proceeding:
>    - Direction: BuyLow or SellHigh
>    - Invest coin & amount (BuyLow → USDT; SellHigh → BTC)
>    - Target (strike) price: `selectPrice`
>    - APY: converted from `apyE8` (see [conversion rule](#apye8--apre8-conversion-rule))
>    - Quote expiration: `expiredAt`
>    
>    **Do not place the order until the user explicitly confirms.** This prevents losses from direction/coin mistakes.
> 7. Place the order via `POST /v5/earn/advance/place-order`
>
> **Never skip steps 3–4 and 6.** Stale quotes (past `expiredAt`) will be rejected by the API. The `expiredAt` expiration time must always be communicated to the user.

**View products** (no auth)
```
GET /v5/earn/advance/product?category=DualAssets
```
> `category` is required: `DualAssets`, `SmartLeverage`, or `DoubleWin`. Optional: `coin`(e.g. BTC), `duration`(e.g. 8h, 1d, 3d, 6d, 12d). Returns product list with `productId`, `baseCoin`, `quoteCoin`, `duration`, `status`(Available/NotAvailable), `isVipProduct`, `expectReceiveAt`, `subscribeStartAt`, `subscribeEndAt`, `applyStartAt`, `settlementTime`, `minPurchaseQuoteAmount`, `minPurchaseBaseAmount`, `remainingAmountQuote`, `remainingAmountBase`, `orderPrecisionDigitalQuote`, `orderPrecisionDigitalBase`.
>
> **DoubleWin** products return: `productId`, `investCoin`, `underlyingAsset`, `duration`, `expectReceiveAt`, `subscribeStartAt`, `subscribeEndAt`, `settlementTime`, `minPurchaseAmount`, `orderPrecisionDigital`, `isRfqProduct`, `lowerPriceBuffer`, `upperPriceBuffer`, `minDeviationRatio`, `maxDeviationRatio`, `priceTickSize`.

**Get real-time quotes** (no auth)
```
GET /v5/earn/advance/product-extra-info?category=DualAssets&productId=81749
```
> Returns `currentPrice`, `buyLowPrice[]` and `sellHighPrice[]` arrays. Each quote has: `selectPrice`, `apyE8`, `maxInvestmentAmount`, `expiredAt` (quote expiration time). ⚠️ Quote expiry handling: see Mandatory pre-order flow step 4. **Tip**: Use WebSocket `earn.dualassets.offers` on `wss://stream.bybit.com/v5/public/fp` for real-time updates instead of polling.

**Place order**
```
POST /v5/earn/advance/place-order
{"category":"DualAssets","productId":81749,"orderType":"Stake","amount":"20","accountType":"FUND","coin":"USDT","orderLinkId":"unique-id-003","dualAssetsExtra":{"orderDirection":"BuyLow","selectPrice":"69500","apyE8":855000000}}
```
> All 8 params required. `dualAssetsExtra` is a nested object with `orderDirection`(BuyLow/SellHigh), `selectPrice`, `apyE8` (see [apyE8 Conversion Rule](#apye8--apre8-conversion-rule)) — **must match a valid, non-expired quote** (⚠️ see Mandatory pre-order flow steps 4 & 6). `orderLinkId` provides idempotency. Order is **async** — use Get Order to track status. Rate limit: 5 req/s.
>
> - **BuyLow**: invest quote coin (USDT), may receive base coin if price drops to target
> - **SellHigh**: invest base coin (BTC), may receive quote coin if price rises to target

**View positions**
```
GET /v5/earn/advance/position?category=DualAssets
```
> Optional: `productId`, `coin`, `limit`(1-20, default 20), `cursor`. Returns: `positionId`, `direction`, `targetPrice`, `amount`, `apyE8`, `status`(Active/Redeeming), `expectReturnCoin`, `expectReturnAmount`, `yieldStartAt`, `yieldEndAt`.

**View orders**
```
GET /v5/earn/advance/order?category=DualAssets
```
> Optional: `productId`, `orderId`, `orderLinkId`, `startTime`, `endTime`, `limit`(1-20), `cursor`. Order status: `Pending` → `Success` → `Settled` or `Fail`. Settlement fields (`settlementCoin`, `settlementAmount`, `settlementPrice`) only available when status=`Settled`.

### WebSocket: Real-time Dual Assets Quotes

```json
// Subscribe on wss://stream.bybit.com/v5/public/fp
{"op": "subscribe", "args": ["earn.dualassets.offers"]}
```

Push data uses compressed field names:

| Key | Full Name | Description |
|-----|-----------|-------------|
| `p` | productId | Product ID |
| `c` | currentPrice | Market index price |
| `b` | buyLowPrice | BuyLow quotes array |
| `s` (outer) | sellHighPrice | SellHigh quotes array |

Inner quote fields (in `b[]` and `s[]`): `s`=selectPrice, `a`=apyE8, `m`=maxInvestmentAmount, `x`=expiredAt.

### DoubleWin

User might say: "Show me double win products", "Stake ETH in double win", "Redeem my double win position", "DoubleWin BTC"

> DoubleWin is a structured product where users invest a single coin and profit from large price movements in **either direction**. If the underlying asset's price moves beyond the upper or lower buffer at settlement, the user profits; otherwise, a portion of the principal may be lost.

**⚠️ Mandatory pre-order flow (Stake)**

> 1. Call `GET /v5/earn/advance/product?category=DoubleWin` to find matching products (filter by `coin` for `investCoin`). Check `isRfqProduct` to determine product type.
> 2. **For fixed-range products** (`isRfqProduct=false`): Call `GET /v5/earn/advance/product-extra-info?category=DoubleWin&productId=<id>` to get `leverage`, `currentPrice`, `expireTime`, `maxInvestmentAmount`. Or use WebSocket `earn.doublewin.offers`.
> 3. **For RFQ products** (`isRfqProduct=true`): Call `GET /v5/earn/advance/double-win-leverage?productId=<id>&initialPrice=<price>&lowerPrice=<lower>&upperPrice=<upper>` to get `leverage` and `expireTime`. `lowerPrice`/`upperPrice` must be multiples of `priceTickSize`.
> 4. Place the order via `POST /v5/earn/advance/place-order` with `doubleWinStakeExtra` before `expireTime`.

**⚠️ Mandatory pre-redemption flow (Redeem)**

> 1. Call `GET /v5/earn/advance/get-redeem-est-amount-list?category=DoubleWin&positionIds=<id>` to get the estimated redemption amount (cached for **10 minutes**)
> 2. Check that `success=true` for the position
> 3. Place the redeem order via `POST /v5/earn/advance/place-order` with `doubleWinRedeemExtra` containing `positionId` and `estRedeemAmount` from step 1
>
> **Never skip step 1.** The server rejects redemption if no valid cached estimation exists. Redemption is not allowed within **30 minutes** before settlement.

**View products** (no auth)
```
GET /v5/earn/advance/product?category=DoubleWin&coin=ETH
```
> Returns: `productId`, `investCoin`, `underlyingAsset`, `duration`, `expectReceiveAt`, `subscribeStartAt`, `subscribeEndAt`, `settlementTime`, `minPurchaseAmount`, `orderPrecisionDigital`, `isRfqProduct`, `lowerPriceBuffer`, `upperPriceBuffer`, `minDeviationRatio`, `maxDeviationRatio`, `priceTickSize`.

**Get institutional quote (fixed-range products)** (no auth)
```
GET /v5/earn/advance/product-extra-info?category=DoubleWin&productId=12345
```
> Returns: `leverage` (max leverage from institutional quote), `currentPrice` (use as `doubleWinStakeExtra.initialPrice`), `expireTime`, `maxInvestmentAmount`. If `leverage` is empty, no valid institutional quote is available. **Tip**: Use WebSocket `earn.doublewin.offers` for real-time updates.

**Get Double Win Leverage (RFQ products only)**
```
GET /v5/earn/advance/double-win-leverage?productId=12346&initialPrice=67890&lowerPrice=65000&upperPrice=75000
```
> Required: `productId`, `initialPrice`, `lowerPrice`, `upperPrice`. `lowerPrice` and `upperPrice` must be multiples of `priceTickSize` and satisfy `lowerPrice < initialPrice < upperPrice`. Returns: `leverage`, `expireTime`, `maxInvestmentAmount`. Order must be placed before `expireTime`. Rate limit: 1 req/s (UID).

**Place Stake order**
```
POST /v5/earn/advance/place-order
{"category":"DoubleWin","productId":12345,"orderType":"Stake","amount":"1000","accountType":"FUND","coin":"USDT","orderLinkId":"dw-stake-001","doubleWinStakeExtra":{"leverage":"2.5","initialPrice":"67890.50"}}
```
> All params required. `doubleWinStakeExtra` must include `leverage` (must not exceed the value from Get Product Extra Info or WebSocket) and `initialPrice` (current market index price from quote). For **RFQ products** (`isRfqProduct=true`), additionally pass `lowerPrice` and `upperPrice` (must be multiples of `priceTickSize`); call Get Double Win Leverage first to obtain leverage and `expireTime`. Order is **async** — use Get Order to track status.

**Get redeem estimation (before redeeming)**
```
GET /v5/earn/advance/get-redeem-est-amount-list?category=DoubleWin&positionIds=20456
```
> Max 5 position IDs (comma-separated). Returns per-position: `success`, `positionId`, `estRedeemAmount`, `estRedeemTime`, `slippageRate`. **Must be called before placing a Redeem order.**

**Place Redeem order**
```
POST /v5/earn/advance/place-order
{"category":"DoubleWin","productId":12345,"orderType":"Redeem","accountType":"FUND","coin":"USDT","orderLinkId":"dw-redeem-001","doubleWinRedeemExtra":{"positionId":"20456","estRedeemAmount":"980.50","isSlippageProtected":false}}
```
> `doubleWinRedeemExtra` must include `positionId` and `estRedeemAmount` (from Get Redeem Estimation). Optional `isSlippageProtected` (default `false`): when `true`, if the actual redemption amount falls below `estRedeemAmount` by more than the slippage threshold, the redemption is rejected; when `false`, the redemption executes even if slippage occurs.
>
> **`amount` vs `estRedeemAmount` clarification**: DoubleWin Redeem orders **do not require** the top-level `amount` field — the system automatically uses the original staked amount from the position. The actual amount the user will receive is `doubleWinRedeemExtra.estRedeemAmount`, which is the estimated redemption value obtained from `get-redeem-est-amount-list` and may differ from the original staked amount due to P&L. Always use `estRedeemAmount` from the estimation API; do not guess or calculate it yourself.

**View positions**
```
GET /v5/earn/advance/position?category=DoubleWin
```
> Optional: `productId`, `coin`, `limit`(1-20, default 20), `cursor`. Returns: `positionId`, `investCoin`, `underlyingAsset`, `amount`, `leverage`, `initialPrice`, `lowerPrice`, `upperPrice`, `duration`, `settlementTime`, `status`(Active/Redeeming), `redeemable`(boolean), `accountType`.

**View orders**
```
GET /v5/earn/advance/order?category=DoubleWin
```
> Optional: `productId`, `orderId`, `orderLinkId`, `startTime`, `endTime`, `limit`(1-20), `cursor`. Order status: `Pending` → `Success` → `Settled` or `Fail`. For Settled orders: `settlementPrice` and `pnl` are available.

### WebSocket: Real-time Double Win Quotes (fixed-range only)

```json
// Subscribe on wss://stream.bybit.com/v5/public/fp
{"op": "subscribe", "args": ["earn.doublewin.offers"]}
```

Push data uses compressed field names:

| Key | Full Name | Description |
|-----|-----------|-------------|
| `p` | productId | Product ID |
| `c` | currentPrice | Current market index price → use as `doubleWinStakeExtra.initialPrice` |
| `l` | leverage | Max leverage multiplier → use as `doubleWinStakeExtra.leverage` (must not exceed) |
| `m` | maxInvestmentAmount | Max investment amount for this quote |
| `e` | expireTime | Quote expiration time (ms timestamp) |

> Only for **fixed-range** products (`isRfqProduct=false`). RFQ products are NOT included — use `/double-win-leverage` endpoint. If `l` is empty string, no valid institutional quote is available.

### Advance Earn API Reference

| Endpoint | Path | Method | Auth | Rate Limit | Required Params | Optional Params |
|----------|------|--------|------|------------|----------------|-----------------|
| Product List | `/v5/earn/advance/product` | GET | No | 50/s (IP) | category(DualAssets/SmartLeverage/DoubleWin) | coin, duration |
| Product Quotes | `/v5/earn/advance/product-extra-info` | GET | No | 50/s (IP) | category, productId | — |
| Place Order | `/v5/earn/advance/place-order` | POST | Yes | 5/s (UID) | category, productId, orderType, amount, accountType, coin, orderLinkId + category-specific extra (dualAssetsExtra / smartLeverageStakeExtra / smartLeverageRedeemExtra / doubleWinStakeExtra / doubleWinRedeemExtra) | interestCard |
| Position | `/v5/earn/advance/position` | GET | Yes | 10/s (UID) | category(DualAssets/SmartLeverage/DoubleWin) | productId, coin, limit, cursor |
| Order History | `/v5/earn/advance/order` | GET | Yes | 10/s (UID) | category(DualAssets/SmartLeverage/DoubleWin) | productId, orderId, orderLinkId, startTime, endTime, limit, cursor |
| Redeem Estimation | `/v5/earn/advance/get-redeem-est-amount-list` | GET | Yes | 10/s (UID) | category(SmartLeverage/DoubleWin), positionIds | — |
| Double Win Leverage | `/v5/earn/advance/double-win-leverage` | GET | Yes | 1/s (UID) | productId, initialPrice, lowerPrice, upperPrice | — |

---

## Scenario: Smart Leverage (Future Boost)

User might say: "Show me smart leverage products", "Open a leveraged position on ETH", "Smart leverage BTC long", "Close my smart leverage position", "Redeem smart leverage", "Future boost"

> Smart Leverage is a **structured leveraged product**. Users invest USDT to open a leveraged position (Long or Short) on an underlying asset (e.g., BTC, ETH). The position has a fixed duration and settles at expiry. P&L depends on the asset's price movement relative to the breakeven price.
>
> **Key concepts:**
> - **Direction**: `Long` (profit when price rises) or `Short` (profit when price falls) — direction is fixed per product, not user-selectable
> - **Leverage**: Fixed per product (e.g., 10x, 50x, 200x)
> - **Breakeven price**: Institutional quote price — must be obtained from Get Product Extra Info or WebSocket before placing an order
> - **Early redemption**: Supported via `Redeem` order type — must call Get Redeem Estimation first

**⚠️ Mandatory pre-order flow (Stake / Open Position)**

> 1. Call `GET /v5/earn/advance/product?category=SmartLeverage` to find a matching product (filter by `coin` for underlying asset, check `direction`, `leverage`, `duration`)
> 2. Call `GET /v5/earn/advance/product-extra-info?category=SmartLeverage&productId=<id>` to get the **institutional quote** (`breakevenPrice`, `currentPrice`, `maxInvestmentAmount`, `expireAt`)
> 3. **Check `expireAt`**: If the quote has expired, re-fetch. If `breakevenPrice` is empty, no valid quote is available — inform the user.
> 4. Place the order via `POST /v5/earn/advance/place-order` with `smartLeverageStakeExtra` containing `initialPrice` (from `currentPrice`) and `breakevenPrice` (from the quote)
>
> **Never skip steps 2–3.** The server validates `initialPrice` is within ±5% of the actual price (error `180030` if exceeded).
>
> **Handling error `180030`**: If the API returns error code `180030`, it means the market price has moved significantly since the quote was fetched. In this case:
> 1. Re-call `GET /v5/earn/advance/product-extra-info?category=SmartLeverage&productId=<id>` to get the latest `currentPrice` and `breakevenPrice`
> 2. Update `initialPrice` and `breakevenPrice` with the new values
> 3. Inform the user: "Market price has moved significantly. Please review the updated quote and confirm."
> 4. Retry the order after user confirmation

**⚠️ Mandatory pre-redemption flow (Redeem / Close Position)**

> 1. Call `GET /v5/earn/advance/get-redeem-est-amount-list?category=SmartLeverage&positionIds=<id>` to get the estimated redemption amount (cached for **10 minutes**)
> 2. Check that `success=true` for the position
> 3. Place the redeem order via `POST /v5/earn/advance/place-order` with `smartLeverageRedeemExtra` containing `positionId` and `estRedeemAmount` from step 1
>
> **Never skip step 1.** The server rejects redemption if no valid cached estimation exists. Redemption is not allowed within **60 minutes** before settlement.

**View products** (no auth)
```
GET /v5/earn/advance/product?category=SmartLeverage
```
> Returns: `productId`, `investCoin`, `underlyingAsset`, `direction`(Long/Short), `leverage`, `duration`, `expectReceiveAt`, `subscribeStartAt`, `subscribeEndAt`, `settlementTime`, `minPurchaseAmount`, `remainingAmount`, `orderPrecisionDigital`.

**Get institutional quote** (no auth)
```
GET /v5/earn/advance/product-extra-info?category=SmartLeverage&productId=13009
```
> Returns: `breakevenPrice` (pass as-is to `smartLeverageStakeExtra.breakevenPrice`), `currentPrice` (use as `smartLeverageStakeExtra.initialPrice`), `expireAt`, `maxInvestmentAmount`. If `breakevenPrice` is empty, no valid institutional quote is available. **Tip**: Use WebSocket `earn.smartleverage.offers` on `wss://stream.bybit.com/v5/public/fp` for real-time updates.

**Place Stake order (open position)**
```
POST /v5/earn/advance/place-order
{"category":"SmartLeverage","productId":13009,"orderType":"Stake","amount":"100","accountType":"FUND","coin":"USDT","orderLinkId":"my-order-001","smartLeverageStakeExtra":{"initialPrice":"615.11","breakevenPrice":"662.737449"}}
```
> All 8 params required. `smartLeverageStakeExtra` must include `initialPrice` and `breakevenPrice` from the quote. Server validates actual price is within ±5% of `initialPrice`. Order is **async** — use Get Order to track status.

**Get redeem estimation (before closing)**
```
GET /v5/earn/advance/get-redeem-est-amount-list?category=SmartLeverage&positionIds=897
```
> Max 5 position IDs (comma-separated). Returns per-position: `success`, `positionId`, `estRedeemAmount`, `estRedeemTime`, `slippageRate`. Cached for **10 minutes**.

**Place Redeem order (close position)**
```
POST /v5/earn/advance/place-order
{"category":"SmartLeverage","productId":13009,"orderType":"Redeem","amount":"100","accountType":"FUND","coin":"USDT","orderLinkId":"my-redeem-001","smartLeverageRedeemExtra":{"positionId":"897","estRedeemAmount":"97.50","isSlippageProtected":false}}
```
> `smartLeverageRedeemExtra` must include `positionId` and `estRedeemAmount` (from Get Redeem Estimation). Optional `isSlippageProtected` (default `false`): when `true`, if the actual redemption amount falls below `estRedeemAmount` by more than the slippage threshold, the redemption is rejected; when `false`, the redemption executes even if slippage occurs.
>
> **`amount` vs `estRedeemAmount` clarification**: The top-level `amount` field is the user's **original invested (staked) amount** for this position — not the redemption payout. The actual amount the user will receive is `smartLeverageRedeemExtra.estRedeemAmount`, which is the estimated redemption value obtained from `get-redeem-est-amount-list` and may differ from `amount` due to P&L. Always use `estRedeemAmount` from the estimation API; do not set it to the same value as `amount`.

**View positions**
```
GET /v5/earn/advance/position?category=SmartLeverage
```
> Optional: `productId`, `coin`, `limit`(1-20, default 20), `cursor`. Returns: `positionId`, `direction`(Long/Short), `leverage`, `amount`, `breakevenPrice`, `initialPrice`, `status`(Active/Redeeming/Settled), `redeemable`(boolean), `settlementTime`, `duration`.

**View orders**
```
GET /v5/earn/advance/order?category=SmartLeverage
```
> Optional: `productId`, `orderId`, `orderLinkId`, `startTime`, `endTime`, `limit`(1-20), `cursor`. Order status: `Pending` → `Success` → `Settled` or `Fail`. For Settled orders: `settlementPrice` and `pnl` are available.

### WebSocket: Real-time Smart Leverage Quotes

```json
// Subscribe on wss://stream.bybit.com/v5/public/fp
{"op": "subscribe", "args": ["earn.smartleverage.offers"]}
```

Push data uses compressed field names:

| Key | Full Name | Description |
|-----|-----------|-------------|
| `p` | productId | Product ID |
| `c` | currentPrice | Current market index price → use as `smartLeverageStakeExtra.initialPrice` |
| `b` | breakevenPrice | Institutional breakeven price → use as `smartLeverageStakeExtra.breakevenPrice` |
| `e` | expireAt | Quote expiration time (ms timestamp) |
| `m` | maxInvestmentAmount | Max investment amount for this quote |

> If `b` is empty string, no valid institutional quote is available. Push triggers on quote change or at ≤30s intervals.

---

## Scenario: Liquidity Mining

User might say: "Show me liquidity mining products", "Add liquidity to BTC/USDT pool", "Remove liquidity", "Check my liquidity mining position", "Reinvest my liquidity mining yield", "Claim interest", "Add margin to my liquidity mining position"

> Liquidity Mining allows users to provide liquidity to trading pools and earn yield. Users can add/remove liquidity with leverage, reinvest yield, add margin, and claim interest. Supports querying products, positions, orders, yield records, and liquidation records.

**⚠️ Mandatory pre-order flow (Add Liquidity)**

> 1. Call `GET /v5/earn/liquidity-mining/product` (optionally filter by `baseCoin` / `quoteCoin`) to find an available product
> 2. Check product `status` is `Available`
> 3. Note key parameters: `productId`, `maxLeverage`, `minInvestmentQuote` / `minInvestmentBase`, `maxInvestmentQuote` / `maxInvestmentBase`, `baseCoinPrecision` / `quoteCoinPrecision`
> 4. Validate the user's intended amount meets minimum requirements and does not exceed maximums
> 5. Determine `leverage`: value must be between `1` (no leverage, default) and the product's `maxLeverage`. If the user does not specify leverage, use `"1"` (1x, no leverage)
> 6. Place the order via `POST /v5/earn/liquidity-mining/add-liquidity`

**View products** (no auth)
```
GET /v5/earn/liquidity-mining/product
```
> Optional: `baseCoin`(e.g. BTC, ETH), `quoteCoin`(e.g. USDT). Returns product list with `productId`, `baseCoin`, `quoteCoin`, `status`(Available), `maxLeverage`, `minInvestmentQuote`, `minInvestmentBase`, `maxInvestmentQuote`, `maxInvestmentBase`, `minWithdrawalAmount`, `baseCoinPrecision`, `quoteCoinPrecision`, `minReinvestAmount`, `yieldCoins`, `apyE8`, `apy7dE8`, `poolLiquidityValue`, `dailyYield`, `slippageLevels`, `slippageRateE8List`, `apyBreakdown`, `apy7dBreakdown`.

**Add liquidity**
```
POST /v5/earn/liquidity-mining/add-liquidity
{"productId":"1001","orderLinkId":"lm-add-001","quoteAccountType":"FUND","baseAccountType":"FUND","quoteAmount":"1000","baseAmount":"0.015","leverage":"1"}
```
> `productId` and `orderLinkId` are required. `quoteAmount` and `baseAmount` are conditionally required — at least one must be provided. `quoteAccountType` is required when injecting quoteCoin; `baseAccountType` is required when injecting baseCoin. `orderLinkId` max 40 chars for idempotency. Rate limit: 5 req/s (UID).

**Remove liquidity**
```
POST /v5/earn/liquidity-mining/remove-liquidity
{"productId":"1001","orderLinkId":"lm-remove-001","positionId":"5001","removeRate":50,"removeType":"Normal"}
```
> Required: `productId`, `orderLinkId`, `positionId`. Optional: `removeRate` (integer 1-100, percentage to redeem; 0 or omitted = 100% full redemption), `removeType` (`Normal` = proportional both coins, `SingleQuoteCoin` = redeem as quoteCoin only, `SingleBaseCoin` = redeem as baseCoin only; default `Normal`). Rate limit: 5 req/s (UID).

**Reinvest**
```
POST /v5/earn/liquidity-mining/reinvest
{"productId":"1001","orderLinkId":"lm-reinvest-001","positionId":"123456"}
```
> Reinvest accrued yield back into the pool. Rate limit: 5 req/s (UID).

**Add margin**
```
POST /v5/earn/liquidity-mining/add-margin
{"productId":"1001","orderLinkId":"lm-margin-001","positionId":"123456","amount":"500","quoteAccountType":"FUND"}
```
> Add margin to an existing leveraged position. All 5 params required. `amount` is the quoteCoin (e.g. USDT) amount to add as margin. Only quoteCoin margin is supported (no baseCoin). Rate limit: 5 req/s (UID).

**Claim interest**
```
POST /v5/earn/liquidity-mining/claim-interest
{"productId":"1001"}
```
> Only `productId` is required (pass `"-1"` to claim all products at once). No `positionId` needed — each product has at most one active position. Yield is credited to the user's default account. Rate limit: 5 req/s (UID).

**View positions**
```
GET /v5/earn/liquidity-mining/position
```
> Optional: `productId`, `baseCoin`. Returns position details including leverage, amounts, yield, and liquidation info.

**View orders**
```
GET /v5/earn/liquidity-mining/order
```
> Optional: `orderId`, `orderLinkId`, `productId`, `orderType`(AddLiquidity/RemoveLiquidity/Reinvest/AddMargin), `status`(Success/Processing), `startTime`, `endTime`, `limit`(1-50, default 20), `cursor`. Pass `orderId` or `orderLinkId` alone to query a single order (other filters ignored).

**View yield records**
```
GET /v5/earn/liquidity-mining/yield-records
```
> Optional: `baseCoin`, `quoteCoin`, `startTime`, `endTime`, `limit`(1-50, default 20), `cursor`. Returns yield claim records.

**View liquidation records**
```
GET /v5/earn/liquidity-mining/liquidation-records
```
> Optional: `baseCoin`, `quoteCoin`, `startTime`, `endTime`, `limit`(1-50, default 20), `cursor`. Returns liquidation records.

### Liquidity Mining API Reference

| Endpoint | Path | Method | Auth | Rate Limit | Required Params | Optional Params |
|----------|------|--------|------|------------|----------------|-----------------|
| Product List | `/v5/earn/liquidity-mining/product` | GET | No | 50/s (IP) | — | baseCoin, quoteCoin |
| Add Liquidity | `/v5/earn/liquidity-mining/add-liquidity` | POST | Yes | 5/s (UID) | productId, orderLinkId, (quoteAmount or baseAmount) | quoteAccountType, baseAccountType, leverage |
| Remove Liquidity | `/v5/earn/liquidity-mining/remove-liquidity` | POST | Yes | 5/s (UID) | productId, orderLinkId, positionId | removeRate, removeType |
| Reinvest | `/v5/earn/liquidity-mining/reinvest` | POST | Yes | 5/s (UID) | productId, orderLinkId, positionId | — |
| Add Margin | `/v5/earn/liquidity-mining/add-margin` | POST | Yes | 5/s (UID) | productId, orderLinkId, positionId, amount, quoteAccountType | — |
| Claim Interest | `/v5/earn/liquidity-mining/claim-interest` | POST | Yes | 5/s (UID) | productId | — |
| Position | `/v5/earn/liquidity-mining/position` | GET | Yes | 10/s (UID) | — | productId, baseCoin |
| Order History | `/v5/earn/liquidity-mining/order` | GET | Yes | 10/s (UID) | — | orderId, orderLinkId, productId, orderType, status, startTime, endTime, limit, cursor |
| Yield Records | `/v5/earn/liquidity-mining/yield-records` | GET | Yes | 10/s (UID) | — | baseCoin, quoteCoin, startTime, endTime, limit, cursor |
| Liquidation Records | `/v5/earn/liquidity-mining/liquidation-records` | GET | Yes | 10/s (UID) | — | baseCoin, quoteCoin, startTime, endTime, limit, cursor |

---

## Scenario: BYUSDT Token (Earn Token)

User might say: "Mint BYUSDT", "Redeem BYUSDT", "Check my BYUSDT position", "What is the APR for BYUSDT", "Show BYUSDT yield history"

> BYUSDT Token is an earn token product. **Mint**: Transfer USDT from your FlexibleSaving account to receive BYUSDT. **Redeem**: Return BYUSDT to receive USDT in your UNIFIED account. Orders are async — use Get Order to track status. `orderLinkId` provides idempotency (same ID always returns the same order).

**Mint BYUSDT**
```
POST /v5/earn/token/place-order
{"coin":"BYUSDT","orderLinkId":"my-mint-001","orderType":"Mint","amount":"100.00","accountType":"FlexibleSaving"}
```
> All 5 params required. Deducts USDT from FlexibleSaving account.

**Redeem BYUSDT**
```
POST /v5/earn/token/place-order
{"coin":"BYUSDT","orderLinkId":"my-redeem-001","orderType":"Redeem","amount":"50.00","accountType":"UNIFIED"}
```
> All 5 params required. Returns USDT to UNIFIED account.

**View orders**
```
GET /v5/earn/token/order?coin=BYUSDT
```
> `coin=BYUSDT` is required. Optional: `orderLinkId`, `orderId`, `orderType`(Mint/Redeem), `startTime`, `endTime`, `cursor`, `limit`(1-100, default 20).

**View position**
```
GET /v5/earn/token/position?coin=BYUSDT
```
> Returns current BYUSDT holding, accrued yield, and related position info.

**View product info** (no auth)
```
GET /v5/earn/token/product?coin=BYUSDT
```
> No auth required. Returns `productId`(integer), `coin`, `mintFeeRateE8`, `redeemFeeRateE8`, `minInvestment`, `userHolding`, `leftQuota`, `canMint`(whether the user can currently mint, based on remaining quota), `savingsBalance`(user's FlexibleSaving USDT balance), `aprE8` (see [apyE8 Conversion Rule](#apye8--apre8-conversion-rule)), `bonusAprE8`, `bonusMaxAmount`, `baseCoinPrecision`, `tokenPrecision`.
>
> **Handling `canMint=false`**: When `canMint` is `false`, inform the user that minting is currently unavailable — typically because the remaining quota (`leftQuota`) has been exhausted. Suggest the user try again later when quota becomes available, and show the current `leftQuota` value for reference.
>
> **Mint prerequisite**: The Mint operation deducts USDT from the user's **FlexibleSaving** account (not FUND or UNIFIED). Check `savingsBalance` — if insufficient, prompt the user to first deposit/stake USDT into FlexibleSaving before minting.

**View yield history**
```
GET /v5/earn/token/yield?coin=BYUSDT
```
> Returns yield records. `hourlyDate` and `createdTime` are in **seconds** (not milliseconds).

**View hourly yield**
```
GET /v5/earn/token/hourly-yield?coin=BYUSDT
```
> Returns hourly yield records. `hourlyDate` and `createdTime` are in **seconds** (not milliseconds).

**View APR history**
```
GET /v5/earn/token/history-apr?coin=BYUSDT&range=2
```
> Required: `coin`, `range`(1=7 days, 2=30 days, 3=180 days). No auth required. Returns historical APR records. `timestamp` is in **milliseconds**.

### BYUSDT Token API Reference

| Endpoint | Path | Method | Auth | Rate Limit | Required Params | Optional Params |
|----------|------|--------|------|------------|----------------|-----------------|
| Place Order | `/v5/earn/token/place-order` | POST | Yes | 5/s (UID) | coin, orderLinkId, orderType, amount, accountType | — |
| Get Order List | `/v5/earn/token/order` | GET | Yes | 10/s (UID) | coin | orderLinkId, orderId, orderType, startTime, endTime, cursor, limit |
| Get Position | `/v5/earn/token/position` | GET | Yes | 20/s (UID) | coin | — |
| Get Product Info | `/v5/earn/token/product` | GET | No | 20/s (IP) | coin | — |
| Get Yield History | `/v5/earn/token/yield` | GET | Yes | 10/s (UID) | coin | startTime, endTime, limit, cursor |
| Get Hourly Yield | `/v5/earn/token/hourly-yield` | GET | Yes | 10/s (UID) | coin | startTime, endTime, limit, cursor |
| Get APR History | `/v5/earn/token/history-apr` | GET | No | 50/s (IP) | coin, range | — |

## Enums (BYUSDT Token)

* **orderType**: `Mint` | `Redeem`
* **accountType (Mint)**: `FlexibleSaving`
* **accountType (Redeem)**: `UNIFIED`
* **coin**: `BYUSDT`