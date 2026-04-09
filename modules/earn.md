# Module: Earn

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Table of Contents

1. [Earn Products](#scenario-earn-products) — FlexibleSaving & OnChain
2. [Advance Earn](#scenario-advance-earn) — Dual Assets / Smart Leverage / DoubleWin
3. [Liquidity Mining](#scenario-liquidity-mining) — Pool liquidity provision
4. [BYUSDT Token](#scenario-byusdt-token) — Mint / Redeem earn token

---

## Global Rules

> **Amount precision**: All `amount` values must be **truncated** (floor, not rounded) to the precision from the product (`orderPrecisionDigital`, `baseCoinPrecision`/`quoteCoinPrecision`). Validate `amount` ≥ min and ≤ max before placing orders.
>
> **`E8` conversion**: Fields like `apyE8`, `aprE8` = value × 10⁸. To display: divide by 10⁸ × 100. Example: `855000000` → **8.55%**. **Never show raw E8 values.**
>
> **`isSlippageProtected`** (SmartLeverage/DoubleWin Redeem): `true` = reject if actual amount falls below `estRedeemAmount` beyond slippage threshold; `false` (default) = execute regardless of slippage.

### `accountType` by Product

| Product | `accountType` |
|---|---|
| FlexibleSaving | `FUND`, `UNIFIED` |
| OnChain | `FUND` only |
| DualAssets / SmartLeverage / DoubleWin | `FUND`, `UNIFIED` |
| Liquidity Mining | `FUND` (via `quoteAccountType`/`baseAccountType`) |
| BYUSDT Mint → `FlexibleSaving` | Redeem → `UNIFIED` |

---

## Scenario: Earn Products

User might say: "Show me available earn products", "Deposit USDT", "Redeem"

```
GET  /v5/earn/product?category=FlexibleSaving&coin=USDT
POST /v5/earn/place-order  {"category":"FlexibleSaving","orderType":"Stake","accountType":"UNIFIED","coin":"USDT","amount":"1000","productId":"123","orderLinkId":"unique-id-123"}
POST /v5/earn/place-order  {"category":"FlexibleSaving","orderType":"Redeem","accountType":"UNIFIED","coin":"USDT","amount":"500","productId":"123","orderLinkId":"unique-id-456"}
GET  /v5/earn/order?category=FlexibleSaving
GET  /v5/earn/position?category=FlexibleSaving
GET  /v5/earn/yield?category=FlexibleSaving&coin=USDT
GET  /v5/earn/hourly-yield?category=FlexibleSaving
```

> Place Order requires all 7 params. Get `productId` from product list first. **OnChain** uses identical flow — replace `category` with `OnChain`, `accountType` must be `FUND`. On-chain transactions may have waiting times.

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Product | `/v5/earn/product` | GET | category | coin |
| Place Order | `/v5/earn/place-order` | POST | category, orderType, accountType, coin, amount, productId, orderLinkId | redeemPositionId, toAccountType |
| Order | `/v5/earn/order` | GET | category | orderId, orderLinkId, productId, startTime, endTime, limit, cursor |
| Position | `/v5/earn/position` | GET | category | productId, coin |
| Yield | `/v5/earn/yield` | GET | category | productId, startTime, endTime, limit, cursor |
| Hourly Yield | `/v5/earn/hourly-yield` | GET | category | productId, startTime, endTime, limit, cursor |

**Enums**: orderType: `Stake`|`Redeem` · category: `FlexibleSaving`|`OnChain`|`DualAssets`|`SmartLeverage`|`DoubleWin`

---

## Scenario: Advance Earn

User might say: "dual assets", "smart leverage", "double win", "future boost", "leveraged position"

> All Advance Earn products share the same base endpoints with `category` parameter.

**View positions / orders** (all categories)
```
GET /v5/earn/advance/position?category=DualAssets
GET /v5/earn/advance/order?category=SmartLeverage
```
> Required: `category`. Optional: `productId`, `coin`, `orderId`, `orderLinkId`, `startTime`, `endTime`, `limit`(1-20), `cursor`. Order status: `Pending` → `Success` → `Settled` or `Fail`.

### Dual Assets

> Structured product with fixed duration. User chooses **BuyLow** (invest USDT, buy BTC if price drops to target) or **SellHigh** (invest BTC, sell if price rises to target). If not reached, principal + yield returned.

**⚠️ Mandatory flow**

> 1. **Ask direction** if not specified — BuyLow or SellHigh
> 2. `GET /v5/earn/advance/product?category=DualAssets` → find `productId`
> 3. `GET /v5/earn/advance/product-extra-info?category=DualAssets&productId=<id>` → get quotes
> 4. **Check `expiredAt`** — only use non-expired quotes. **Always tell user the expiration time.**
> 5. **Confirm with user** before placing: direction, coin & amount, strike price (`selectPrice`), APY, `expiredAt`. **Do not place until user confirms.**
> 6. `POST /v5/earn/advance/place-order`

```
GET /v5/earn/advance/product?category=DualAssets&coin=BTC
```
> Returns: `productId`, `baseCoin`, `quoteCoin`, `duration`, `status`, `isVipProduct`, `expectReceiveAt`, `subscribeStartAt`/`EndAt`, `applyStartAt`, `settlementTime`, `minPurchaseQuoteAmount`/`BaseAmount`, `remainingAmountQuote`/`Base`, `orderPrecisionDigitalQuote`/`Base`.

```
GET /v5/earn/advance/product-extra-info?category=DualAssets&productId=81749
```
> Returns `currentPrice`, `buyLowPrice[]`, `sellHighPrice[]`. Each quote: `selectPrice`, `apyE8`, `maxInvestmentAmount`, `expiredAt`. **Tip**: WebSocket `earn.dualassets.offers` for real-time updates.

```
POST /v5/earn/advance/place-order
{"category":"DualAssets","productId":81749,"orderType":"Stake","amount":"20","accountType":"FUND","coin":"USDT","orderLinkId":"unique-id-003","dualAssetsExtra":{"orderDirection":"BuyLow","selectPrice":"69500","apyE8":855000000}}
```
> All 8 params required. `dualAssetsExtra`: `orderDirection`(BuyLow/SellHigh), `selectPrice`, `apyE8` — must match valid non-expired quote. BuyLow → invest USDT; SellHigh → invest BTC.

### Smart Leverage (Future Boost)

> Structured leveraged product. Invest USDT for Long/Short position on underlying asset (BTC, ETH). Direction and leverage are **fixed per product** (not user-selectable). P&L depends on price vs breakeven price.

**⚠️ Mandatory Stake flow**

> 1. `GET /v5/earn/advance/product?category=SmartLeverage` → find product (check `direction`, `leverage`, `duration`)
> 2. `GET /v5/earn/advance/product-extra-info?category=SmartLeverage&productId=<id>` → get `breakevenPrice`, `currentPrice`, `expireAt`, `maxInvestmentAmount`
> 3. **Check `expireAt`**. If `breakevenPrice` is empty → no valid quote, inform user.
> 4. Place order with `smartLeverageStakeExtra` (`initialPrice` from `currentPrice`, `breakevenPrice` from quote)
>
> Server validates `initialPrice` within ±5% of actual price (error `180030`). On `180030`: re-fetch quote, inform user, retry after confirmation.

**⚠️ Mandatory Redeem flow**

> 1. `GET /v5/earn/advance/get-redeem-est-amount-list?category=SmartLeverage&positionIds=<id>` → cached **10 min**
> 2. Check `success=true`, place with `smartLeverageRedeemExtra` (`positionId`, `estRedeemAmount`)
>
> Redemption blocked within **60 min** before settlement. Top-level `amount` = original staked amount (required). `estRedeemAmount` = actual payout (may differ due to P&L) — always use value from estimation API.

```
GET /v5/earn/advance/product?category=SmartLeverage
```
> Returns: `productId`, `investCoin`, `underlyingAsset`, `direction`(Long/Short), `leverage`, `duration`, `expectReceiveAt`, `subscribeStartAt`/`EndAt`, `settlementTime`, `minPurchaseAmount`, `remainingAmount`, `orderPrecisionDigital`.

```
GET /v5/earn/advance/product-extra-info?category=SmartLeverage&productId=13009
```
> Returns: `breakevenPrice`, `currentPrice`, `expireAt`, `maxInvestmentAmount`.

```
POST /v5/earn/advance/place-order
{"category":"SmartLeverage","productId":13009,"orderType":"Stake","amount":"100","accountType":"FUND","coin":"USDT","orderLinkId":"my-order-001","smartLeverageStakeExtra":{"initialPrice":"615.11","breakevenPrice":"662.737449"}}
```

```
POST /v5/earn/advance/place-order
{"category":"SmartLeverage","productId":13009,"orderType":"Redeem","amount":"100","accountType":"FUND","coin":"USDT","orderLinkId":"my-redeem-001","smartLeverageRedeemExtra":{"positionId":"897","estRedeemAmount":"97.50","isSlippageProtected":false}}
```

### DoubleWin

> Structured product — profit from large price movements in **either direction**. If price moves beyond upper/lower buffer at settlement, user profits; otherwise partial principal loss.

**⚠️ Mandatory Stake flow**

> 1. `GET /v5/earn/advance/product?category=DoubleWin` → check `isRfqProduct`
> 2. **Fixed-range** (`isRfqProduct=false`): `GET /v5/earn/advance/product-extra-info?category=DoubleWin&productId=<id>` → get `leverage`, `currentPrice`, `expireTime`. Or WebSocket `earn.doublewin.offers`.
> 3. **RFQ** (`isRfqProduct=true`): `GET /v5/earn/advance/double-win-leverage?productId=<id>&initialPrice=<p>&lowerPrice=<l>&upperPrice=<u>` → get `leverage`, `expireTime`. Prices must be multiples of `priceTickSize`, `lowerPrice < initialPrice < upperPrice`. Rate limit: 1/s.
> 4. Place order with `doubleWinStakeExtra` before `expireTime`.

**⚠️ Mandatory Redeem flow**

> 1. `GET /v5/earn/advance/get-redeem-est-amount-list?category=DoubleWin&positionIds=<id>` → cached **10 min**
> 2. Place with `doubleWinRedeemExtra` (`positionId`, `estRedeemAmount`). Top-level `amount` is **not required** for DoubleWin Redeem (system uses original staked amount). `estRedeemAmount` = actual payout — always from estimation API.
>
> Redemption blocked within **30 min** before settlement.

```
GET /v5/earn/advance/product?category=DoubleWin
```
> Returns: `productId`, `investCoin`, `underlyingAsset`, `duration`, `expectReceiveAt`, `subscribeStartAt`/`EndAt`, `settlementTime`, `minPurchaseAmount`, `orderPrecisionDigital`, `isRfqProduct`, `lowerPriceBuffer`, `upperPriceBuffer`, `minDeviationRatio`, `maxDeviationRatio`, `priceTickSize`.

```
POST /v5/earn/advance/place-order
{"category":"DoubleWin","productId":12345,"orderType":"Stake","amount":"1000","accountType":"FUND","coin":"USDT","orderLinkId":"dw-stake-001","doubleWinStakeExtra":{"leverage":"2.5","initialPrice":"67890.50"}}
```
> `doubleWinStakeExtra`: `leverage` (≤ quote value), `initialPrice` (from `currentPrice`). RFQ products additionally need `lowerPrice`, `upperPrice`.

```
POST /v5/earn/advance/place-order
{"category":"DoubleWin","productId":12345,"orderType":"Redeem","accountType":"FUND","coin":"USDT","orderLinkId":"dw-redeem-001","doubleWinRedeemExtra":{"positionId":"20456","estRedeemAmount":"980.50","isSlippageProtected":false}}
```

### Redeem Estimation (SmartLeverage / DoubleWin shared)

```
GET /v5/earn/advance/get-redeem-est-amount-list?category=SmartLeverage&positionIds=897,898
```
> Max 5 position IDs (comma-separated). Returns per-position: `success`, `positionId`, `estRedeemAmount`, `estRedeemTime`, `slippageRate`. **Must call before any Redeem order.**

### WebSocket: Real-time Quotes

All on `wss://stream.bybit.com/v5/public/fp`. Subscribe: `{"op":"subscribe","args":["<topic>"]}`

**`earn.dualassets.offers`** — `p`=productId, `c`=currentPrice, `b`=buyLowPrice[], `s`=sellHighPrice[]. Inner: `s`=selectPrice, `a`=apyE8, `m`=maxInvestmentAmount, `x`=expiredAt.

**`earn.smartleverage.offers`** — `p`=productId, `c`=currentPrice (→`initialPrice`), `b`=breakevenPrice (→`breakevenPrice`), `e`=expireAt, `m`=maxInvestmentAmount. Empty `b` = no valid quote.

**`earn.doublewin.offers`** (fixed-range only) — `p`=productId, `c`=currentPrice (→`initialPrice`), `l`=leverage, `m`=maxInvestmentAmount, `e`=expireTime. Empty `l` = no valid quote. RFQ products use `/double-win-leverage` endpoint.

### Advance Earn API Reference

| Endpoint | Path | Method | Auth | Rate | Required | Optional |
|----------|------|--------|------|------|----------|----------|
| Product List | `/v5/earn/advance/product` | GET | No | 50/s | category | coin, duration |
| Product Quotes | `/v5/earn/advance/product-extra-info` | GET | No | 50/s | category, productId | — |
| Place Order | `/v5/earn/advance/place-order` | POST | Yes | 5/s | category, productId, orderType, amount, accountType, coin, orderLinkId + category extra | interestCard |
| Position | `/v5/earn/advance/position` | GET | Yes | 10/s | category | productId, coin, limit, cursor |
| Order | `/v5/earn/advance/order` | GET | Yes | 10/s | category | productId, orderId, orderLinkId, startTime, endTime, limit, cursor |
| Redeem Est. | `/v5/earn/advance/get-redeem-est-amount-list` | GET | Yes | 10/s | category(SL/DW), positionIds | — |
| DW Leverage | `/v5/earn/advance/double-win-leverage` | GET | Yes | 1/s | productId, initialPrice, lowerPrice, upperPrice | — |

---

## Scenario: Liquidity Mining

User might say: "liquidity mining", "add liquidity", "remove liquidity", "claim interest", "add margin"

> Provide liquidity to trading pools, earn yield. Supports leverage, reinvest, add margin, claim interest.

**⚠️ Pre-order flow**: `GET /v5/earn/liquidity-mining/product` → check `status=Available`, note `maxLeverage`, min/max amounts, precision → validate user input → place order.

```
GET /v5/earn/liquidity-mining/product
```
> Optional: `baseCoin`, `quoteCoin`. Returns: `productId`, `baseCoin`, `quoteCoin`, `status`, `maxLeverage`, `minInvestmentQuote`/`Base`, `maxInvestmentQuote`/`Base`, `minWithdrawalAmount`, `baseCoinPrecision`, `quoteCoinPrecision`, `minReinvestAmount`, `yieldCoins`, `apyE8`, `apy7dE8`, `poolLiquidityValue`, `dailyYield`, `slippageLevels`, `slippageRateE8List`.

```
POST /v5/earn/liquidity-mining/add-liquidity
{"productId":"1001","orderLinkId":"lm-add-001","quoteAccountType":"FUND","baseAccountType":"FUND","quoteAmount":"1000","baseAmount":"0.015","leverage":"1"}
```
> Required: `productId`, `orderLinkId`. At least one of `quoteAmount`/`baseAmount`. `quoteAccountType` required with `quoteAmount`; `baseAccountType` required with `baseAmount`. `orderLinkId` max 40 chars.

```
POST /v5/earn/liquidity-mining/remove-liquidity
{"productId":"1001","orderLinkId":"lm-remove-001","positionId":"5001","removeRate":50,"removeType":"Normal"}
```
> Required: `productId`, `orderLinkId`, `positionId`. Optional: `removeRate`(int 1-100, 0/omitted=100%), `removeType`(`Normal`|`SingleQuoteCoin`|`SingleBaseCoin`, default `Normal`).

```
POST /v5/earn/liquidity-mining/reinvest
{"productId":"1001","orderLinkId":"lm-reinvest-001","positionId":"5001"}
```

```
POST /v5/earn/liquidity-mining/add-margin
{"productId":"1001","orderLinkId":"lm-margin-001","positionId":"5001","amount":"500","quoteAccountType":"FUND"}
```
> All 5 params required. `amount` = quoteCoin margin only (no baseCoin support).

```
POST /v5/earn/liquidity-mining/claim-interest
{"productId":"1001"}
```
> Only `productId` required (pass `"-1"` to claim all). No `positionId` needed.

```
GET /v5/earn/liquidity-mining/position
GET /v5/earn/liquidity-mining/order
GET /v5/earn/liquidity-mining/yield-records
GET /v5/earn/liquidity-mining/liquidation-records
```

| Endpoint | Path | Method | Required | Optional |
|----------|------|--------|----------|----------|
| Product | `.../product` | GET | — | baseCoin, quoteCoin |
| Add Liquidity | `.../add-liquidity` | POST | productId, orderLinkId, (quoteAmount or baseAmount) | quoteAccountType, baseAccountType, leverage |
| Remove Liquidity | `.../remove-liquidity` | POST | productId, orderLinkId, positionId | removeRate, removeType |
| Reinvest | `.../reinvest` | POST | productId, orderLinkId, positionId | — |
| Add Margin | `.../add-margin` | POST | productId, orderLinkId, positionId, amount, quoteAccountType | — |
| Claim Interest | `.../claim-interest` | POST | productId | — |
| Position | `.../position` | GET | — | productId, baseCoin |
| Order | `.../order` | GET | — | orderId, orderLinkId, productId, orderType, status, startTime, endTime, limit, cursor |
| Yield Records | `.../yield-records` | GET | — | baseCoin, quoteCoin, startTime, endTime, limit, cursor |
| Liquidation Records | `.../liquidation-records` | GET | — | baseCoin, quoteCoin, startTime, endTime, limit, cursor |

---

## Scenario: BYUSDT Token

User might say: "Mint BYUSDT", "Redeem BYUSDT", "BYUSDT APR"

> **Mint**: USDT from FlexibleSaving → BYUSDT. **Redeem**: BYUSDT → USDT to UNIFIED. Orders async. `orderLinkId` for idempotency.

```
POST /v5/earn/token/place-order
{"coin":"BYUSDT","orderLinkId":"my-mint-001","orderType":"Mint","amount":"100.00","accountType":"FlexibleSaving"}
```

```
POST /v5/earn/token/place-order
{"coin":"BYUSDT","orderLinkId":"my-redeem-001","orderType":"Redeem","amount":"50.00","accountType":"UNIFIED"}
```

```
GET /v5/earn/token/product?coin=BYUSDT
```
> Returns: `productId`, `mintFeeRateE8`, `redeemFeeRateE8`, `minInvestment`, `userHolding`, `leftQuota`, `canMint`, `savingsBalance`, `aprE8`, `bonusAprE8`, `bonusMaxAmount`, `baseCoinPrecision`, `tokenPrecision`.
>
> **`canMint=false`**: quota exhausted (`leftQuota`), suggest retry later. **Mint prerequisite**: deducts from FlexibleSaving — check `savingsBalance` first.

```
GET /v5/earn/token/order?coin=BYUSDT
GET /v5/earn/token/position?coin=BYUSDT
GET /v5/earn/token/yield?coin=BYUSDT
GET /v5/earn/token/hourly-yield?coin=BYUSDT
GET /v5/earn/token/history-apr?coin=BYUSDT&range=2
```
> Yield/hourly-yield timestamps in **seconds**. APR history: `range`(1=7d, 2=30d, 3=180d), timestamps in **milliseconds**.

| Endpoint | Path | Method | Auth | Required | Optional |
|----------|------|--------|------|----------|----------|
| Place Order | `/v5/earn/token/place-order` | POST | Yes | coin, orderLinkId, orderType, amount, accountType | — |
| Order List | `/v5/earn/token/order` | GET | Yes | coin | orderLinkId, orderId, orderType, startTime, endTime, cursor, limit |
| Position | `/v5/earn/token/position` | GET | Yes | coin | — |
| Product Info | `/v5/earn/token/product` | GET | No | coin | — |
| Yield History | `/v5/earn/token/yield` | GET | Yes | coin | startTime, endTime, limit, cursor |
| Hourly Yield | `/v5/earn/token/hourly-yield` | GET | Yes | coin | startTime, endTime, limit, cursor |
| APR History | `/v5/earn/token/history-apr` | GET | No | coin, range | — |