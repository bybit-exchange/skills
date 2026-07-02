# Module: Earn

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Table of Contents

1. [Earn Products](#scenario-earn-products) — FlexibleSaving & OnChain
2. [Fixed Term](#scenario-fixed-term) — FixedTermSaving / FundPool / FundPoolPremium
3. [Advance Earn](#scenario-advance-earn) — Dual Assets / Smart Leverage / DoubleWin / Discount Buy
4. [Liquidity Mining](#scenario-liquidity-mining) — Pool liquidity provision
5. [BYUSDT Token](#scenario-byusdt-token) — Mint / Redeem earn token
6. [RWA Earn](#scenario-rwa-earn) — Tokenized real-world asset stake/redeem (BlackRock IGBF etc.)
7. [Hold-to-Earn](#scenario-hold-to-earn) — Airdrop yield by holding coins
8. [PWM (Private Wealth Management)](#scenario-pwm) — Institutional fund management & user investment plans

---

## Global Rules

> **Amount precision**: All `amount` values must be **truncated** (floor, not rounded) to the precision from the product (`orderPrecisionDigital`, `baseCoinPrecision`/`quoteCoinPrecision`). Validate `amount` ≥ min and ≤ max before placing orders.
>
> **`E8` conversion**: Fields like `apyE8`, `aprE8` = value × 10⁸. To display: divide by 10⁸ × 100. Example: `855000000` → **8.55%**. **Never show raw E8 values.**
>
> **`isSlippageProtected`** (SmartLeverage/DoubleWin Redeem): `true` = reject if actual amount falls below `estRedeemAmount` beyond slippage threshold; `false` (default) = execute regardless of slippage.
>
> **`orderLinkId` uniqueness**: For Liquidity Mining and Advance Earn, once an `orderLinkId` is used, the same value **cannot be reused** — resubmission returns an error. Always generate a unique value per request.

### `accountType` by Product

| Product | `accountType` |
|---|---|
| FlexibleSaving | `FUND`, `UNIFIED` |
| OnChain | `FUND` only |
| FixedTermSaving / FundPool / FundPoolPremium | `FUND`, `UNIFIED` |
| DualAssets / SmartLeverage / DoubleWin / DiscountBuy | `FUND`, `UNIFIED` |
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
| Place Order | `/v5/earn/place-order` | POST | category, orderType, accountType, coin, amount, productId, orderLinkId | redeemPositionId, toAccountType, interestCard |
| Order | `/v5/earn/order` | GET | category | orderId, orderLinkId, productId, startTime, endTime, limit, cursor |
| Position | `/v5/earn/position` | GET | category | productId, coin |
| Yield | `/v5/earn/yield` | GET | category | productId, startTime, endTime, limit, cursor |
| Hourly Yield | `/v5/earn/hourly-yield` | GET | category | productId, startTime, endTime, limit, cursor |
| List Coupons | `/v5/earn/coupons` | GET | category | — |

**Enums**: orderType: `Stake`|`Redeem` · category: `FlexibleSaving`|`OnChain`

> **Coupons** (`/v5/earn/coupons`, category: `FlexibleSaving`|`DualAssets`): returns user's `interestCards` (interest-rate coupons) and `awardCards` (Dual Assets reward cards / trial funds). Card status: `InUse`|`NotUse`|`Expired`|`AlreadyUsed`. To apply when staking, pass `interestCard:{awardId, specCode}` to `/v5/earn/place-order` (FlexibleSaving Stake) or `/v5/earn/advance/place-order` (DualAssets). Rate limit: 10 req/s (UID).

---

## Scenario: Fixed Term

User might say: "fixed term savings", "fund pool", "fixed deposit", "lock USDT for 30 days", "auto reinvest", "early redeem fixed"

> Fixed-duration earn products. Sub-categories: **FixedTermSaving**, **FundPool** (may allow early redemption at discounted APY), **FundPoolPremium**.
>
> **Tiered APY**: `tieredApyList` — APY varies by amount tier (`max: "-1"` = unlimited). **Multi-coin rewards**: `interestCoinApyList` — interest may be paid in a different coin.
>
> **Early redemption**: Only if `allowEarlyRedemption=true` and `redemptionLimitDuration` has passed. FundPool → `earlyRedemptionApy` (discounted); FixedTermSaving → **zero** earnings. Warn user before confirming. Normal maturity redemption is automatic.
>
> **Auto-reinvest**: FundPool only, if `allowAutoReinvest=true`.

**⚠️ Mandatory Stake flow**: `GET product` → check `status=Available`, validate amount against min/max, truncate to `precision` → show user coin, duration, tiered APY, early redemption policy → confirm → `POST place-order`.

```
POST /v5/earn/fixed-term/place-order
{"productId":"1001","category":"FixedTermSaving","coin":"USDT","amount":"1000","accountType":"FUND","orderLinkId":"ft-stake-001"}
```

```
POST /v5/earn/fixed-term/redeem
{"productId":"1002","category":"FundPool","positionId":"88001"}
```

```
POST /v5/earn/fixed-term/position/auto-invest
{"productId":"1002","category":"FundPool","positionId":"88001","status":"Enable"}
```

| Endpoint | Path | Method | Auth | Rate | Required | Optional |
|----------|------|--------|------|------|----------|----------|
| Product List | `/v5/earn/fixed-term/product` | GET | No | 50/s | — | coin |
| Place Order | `/v5/earn/fixed-term/place-order` | POST | Yes | 5/s | productId, category, coin, amount, accountType, orderLinkId | autoInvest (FundPool only) |
| Redeem | `/v5/earn/fixed-term/redeem` | POST | Yes | 5/s | productId, category, positionId | — |
| Set Auto-Invest | `/v5/earn/fixed-term/position/auto-invest` | POST | Yes | 5/s | productId, category, positionId, status | — |
| Position | `/v5/earn/fixed-term/position` | GET | Yes | 10/s | — | productId, category, coin |
| Order | `/v5/earn/fixed-term/order` | GET | Yes | 10/s | — | orderType, productId, category, orderId, startTime, endTime, limit, cursor |

> **`status` enum** (auto-invest): `Enable` \| `Disable` (string — **not a boolean**). When `productId` is passed to `order` history, `category` must also be supplied.

**Enums**: category: `FixedTermSaving`|`FundPool`|`FundPoolPremium` · status: `Available`|`SoldOut`|`NotStarted` · orderType: `Stake`|`Redeem`|`Reinvest` · accountType: `FUND`|`UNIFIED`

---

## Scenario: Advance Earn

User might say: "dual assets", "smart leverage", "double win", "future boost", "leveraged position", "discount buy"

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

### Discount Buy

> Structured **knockout-barrier** product. User stakes USDT with two price levels:
> - **Knocked out** (settlement price ≥ `knockoutPrice`): receive USDT principal + coupon (`knockoutCouponE8` annualized × durationDays / 365).
> - **Exercised** (settlement price < `knockoutPrice`): receive underlying asset at `purchasePrice` (`settleType=Base`) or equivalent USDT (`settleType=Quote`).
>
> `duration` filter not applicable (ignored). Only `Stake` supported — no pre-settlement redemption.

**⚠️ Mandatory flow**: `GET product` → `GET product-extra-info` for quotes (returns `currentPrice`, `purchasePrice`, `knockoutPrice`, `knockoutCouponE8`, `maxInvestmentAmount`, `instUid`, `expiredAt`) → check `expiredAt` (only use non-expired, **tell user expiry**) → confirm underlying asset, amount, purchase price, knockout price, coupon, settlement preference → `POST place-order` with `discountBuyExtra`.

```
POST /v5/earn/advance/place-order
{"category":"DiscountBuy","productId":54321,"orderType":"Stake","amount":"100","accountType":"FUND","coin":"USDT","orderLinkId":"db-stake-001","discountBuyExtra":{"initialPrice":"67890.50","purchasePrice":"65000.00","knockoutPrice":"72000.00","knockoutCouponE8":200000000,"instUid":1001,"settleType":"Base"}}
```

> `discountBuyExtra` — all 6 required. Pass values **as-is** from `product-extra-info`:
> - `initialPrice` — spot at order time (from `currentPrice`), max 8 decimals, used for slippage protection
> - `purchasePrice` — strike (from quote)
> - `knockoutPrice` — knockout barrier (from quote); must be strictly greater than `purchasePrice`
> - `knockoutCouponE8` — coupon annualized × 10⁸ (from quote), integer
> - `instUid` — market maker UID (from quote), integer
> - `settleType` — `Base` (receive underlying) \| `Quote` (receive USDT); only applies when exercised

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
| Product List | `/v5/earn/advance/product` | GET | No | 50/s | category | coin, duration (not for DiscountBuy) |
| Product Quotes | `/v5/earn/advance/product-extra-info` | GET | No | 50/s | category, productId (DualAssets) | productId (other categories) |
| Place Order | `/v5/earn/advance/place-order` | POST | Yes | 5/s | category, productId, orderType, amount, accountType, coin, orderLinkId + category extra | interestCard (not for DiscountBuy) |
| Position | `/v5/earn/advance/position` | GET | Yes | 10/s | category | productId, coin, limit, cursor |
| Order | `/v5/earn/advance/order` | GET | Yes | 10/s | category | productId, orderId, orderLinkId, startTime, endTime, limit, cursor |
| Redeem Est. | `/v5/earn/advance/get-redeem-est-amount-list` | GET | Yes | 10/s | category(SL/DW), positionIds | — |
| DW Leverage | `/v5/earn/advance/double-win-leverage` | GET | Yes | 1/s | productId, initialPrice, lowerPrice, upperPrice | — |

**category enum**: `DualAssets`|`SmartLeverage`|`DoubleWin`|`DiscountBuy`

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

> **Order endpoint behavior**: Pass `orderId` or `orderLinkId` alone to retrieve a single order (`Pending` orders visible). Without `orderId`/`orderLinkId`, returns a paginated list (`Pending` excluded; `Success`, `Processing`, and `Fail` orders are all included). `status` filter supports `Success`|`Processing` only — `Fail` orders are returned by default but passing `status=Fail` returns error `180001`.

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
>
> **Order List response fields** — each entry includes `orderId`, `orderLinkId`, `orderType` (`Mint`|`Redeem`), `fromCoin`, `toCoin`, `fromAmount`, `toAmount`, `serviceFee`, `status` (`Success`|`Fail`|`Processing`), `createdTime`, plus:
> - `fromAccount`: `FlexibleSaving`|`UNIFIED`|`TRADFI` — Mint=`FlexibleSaving`; Redeem=`UNIFIED`; TradFi-originated Redeem=`TRADFI`
> - `toAccount`: `FlexibleSaving`|`UNIFIED`|`TRADFI` — Mint=`UNIFIED`; Redeem=`FlexibleSaving`; TradFi-originated Redeem=`TRADFI`
> - `externalEventType`: `""`|`RPL_CLOSE`|`COMMISSION`|`DIVIDEND`|`ROLLOVER`|`RISK_ADJUSTMENT` — empty for user-initiated `Mint`/`Redeem`; populated only when the redemption was triggered by an external TradFi (MT5) account event: `RPL_CLOSE` (realised PnL on position close, includes swap / overnight fee), `COMMISSION` (position-open commission), `DIVIDEND` (index dividend distribution), `ROLLOVER` (contract rollover), `RISK_ADJUSTMENT` (risk-control adjustment)
>
> **Note**: TradFi-originated balance changes (close-PnL, commission, dividend, etc.) are also surfaced under `orderType=Redeem`. Use `externalEventType` to distinguish a TradFi-driven redemption from a user-initiated one.

| Endpoint | Path | Method | Auth | Required | Optional |
|----------|------|--------|------|----------|----------|
| Place Order | `/v5/earn/token/place-order` | POST | Yes | coin, orderLinkId, orderType, amount, accountType | — |
| Order List | `/v5/earn/token/order` | GET | Yes | coin | orderLinkId, orderId, orderType, startTime, endTime, cursor, limit |
| Position | `/v5/earn/token/position` | GET | Yes | coin | — |
| Product Info | `/v5/earn/token/product` | GET | No | coin | — |
| Yield History | `/v5/earn/token/yield` | GET | Yes | coin | startTime, endTime, limit, cursor |
| Hourly Yield | `/v5/earn/token/hourly-yield` | GET | Yes | coin | startTime, endTime, limit, cursor |
| APR History | `/v5/earn/token/history-apr` | GET | No | coin, range | — |

---

## Scenario: RWA Earn

User might say: "RWA earn", "tokenized real-world asset", "BlackRock IGBF", "stake RWA", "redeem RWA shares", "NAV chart"

> Bybit V5 RWA (Real World Asset) Earn — Stake (subscribe shares) and Redeem (redeem shares) tokenized real-world asset products. Each product holds shares of an underlying asset (e.g. IGBF) priced by NAV. Settlement is T+N, NAV-based valuation.

**⚠️ Mandatory Stake/Redeem flow**

> 1. `GET /v5/earn/rwa/product` → find `productId`, check `nav`, `minStakeAmount`/`maxStakeAmount`, `userQuota`, `redeemFeeRate`
> 2. **Confirm with user** before placing: product, settlement coin, amount or shares, current NAV, expected settlement time
> 3. `POST /v5/earn/rwa/place-order` with unique `orderLinkId` (max 36 chars, charset `[a-zA-Z0-9-_]`, required)
> 4. Track via `GET /v5/earn/rwa/order` (poll until `status=Success` or `Failed`)

```
GET  /v5/earn/rwa/product?coin=USDC
POST /v5/earn/rwa/place-order  {"productId":1001,"orderType":"Stake","coin":"USDC","stakeAmount":"100","accountType":"FUND","orderLinkId":"my-stake-001"}
POST /v5/earn/rwa/place-order  {"productId":1001,"orderType":"Redeem","coin":"USDC","redeemShares":"50","accountType":"FUND","orderLinkId":"my-redeem-001"}
GET  /v5/earn/rwa/position
GET  /v5/earn/rwa/order?orderLinkId=my-stake-001
GET  /v5/earn/rwa/nav-chart?productId=1001
```

| Endpoint | Path | Method | Auth | Rate | Required | Optional |
|----------|------|--------|------|------|----------|----------|
| Product List | `/v5/earn/rwa/product` | GET | No | 20/s IP | — | coin |
| Place Order | `/v5/earn/rwa/place-order` | POST | Yes | 5/s UID | productId, orderType, coin, orderLinkId | stakeAmount (Stake), redeemShares (Redeem), accountType |
| Position | `/v5/earn/rwa/position` | GET | Yes | 10/s UID | — | — |
| Order List | `/v5/earn/rwa/order` | GET | Yes | 10/s UID | — | orderId, orderLinkId, orderType, productId, startTime, endTime, limit (1–50, default 20), cursor |
| NAV Chart | `/v5/earn/rwa/nav-chart` | GET | No | 20/s IP | productId | startTime, endTime |

**Enums**: orderType: `Stake`|`Redeem` · accountType: `FUND`(default)|`UNIFIED` · order status: `Processing`|`Success`|`Failed` · savingType: `Flexible`|`Fixed`

> **⚠️ Timestamp unit (RWA-specific)**: `startTime` / `endTime` on `/v5/earn/rwa/order` and `/v5/earn/rwa/nav-chart` are **Unix seconds**, NOT milliseconds. This differs from Bybit V5 default (most other endpoints use ms). Sending ms will be rejected or return empty.
>
> **Stake**: requires `stakeAmount`; deducts settlement coin from `accountType`, allocates shares at next NAV. **Redeem**: requires `redeemShares`; locks shares, refunds settlement coin to `accountType` after T+N settlement. `orderLinkId` reuse returns error `180025`. Order list: `startTime` defaults 7d ago, earliest 180d ago, `limit` max **50** (not 100). NAV chart: time span ≤ 180 days; `startTime` defaults `endTime - 7d`, `endTime` defaults now.

**RWA Error codes (180xxx)**: `180007` Product offline / out of subscription window · `180008` Product does not exist · `180012` Purchase share out of [min,max] range · `180013` Stake over individual maximum · `180014` Redeem share invalid · `180015` Sold out · `180016` Balance not enough · `180019` orderLinkId required · `180020` Position not found · `180022` KYC level not reached · `180025` Duplicate orderLinkId · `180029` Redeem not allowed.

---

## Scenario: Hold-to-Earn

User might say: "hold to earn", "airdrop yield", "holding rewards", "USDE yield"

> Earn yield by holding eligible coins (USDE, USD1) — no staking needed, yield distributed daily as airdrops.

| Endpoint | Path | Method | Auth | Required | Optional |
|----------|------|--------|------|----------|----------|
| Product List | `/v5/earn/hold-to-earn/product` | GET | No | — | — |
| Yield History | `/v5/earn/hold-to-earn/yield-history` | GET | Yes | limit (1-49) | timeStart, timeEnd, cursor |

> **Notes**:
> - Product status: `NotStarted`, `Online`, `Ended`. Only `Online` products distribute yield.
> - `timeStart`/`timeEnd` are Unix seconds, cannot query >3 months ago.
> - Response: `effectiveAmount` (principal), `pnl` (yield distributed), `apy` (annualized rate).

---

## Scenario: PWM

User might say: "private wealth", "PWM", "investment plan", "fund management", "asset manager", "subscribe plan", "redeem plan"

> Private Wealth Management — institutional fund management and user investment plans.

### PWM — User Side

| Endpoint | Path | Method | Auth | Required | Optional |
|----------|------|--------|------|----------|----------|
| List Plans | `/v5/earn/pwm/investment-plan/all` | GET | Yes | — | planId, status, limit, cursor |
| Plan Detail | `/v5/earn/pwm/investment-plan/detail` | GET | Yes | planId | — |
| New Plan Detail | `/v5/earn/pwm/investment-plan/new-plan` | GET | Yes | planId | — |
| Subscribe | `/v5/earn/pwm/investment-plan/subscribe` | POST | Yes | planId, orderLinkId | accountType |
| Invest More | `/v5/earn/pwm/investment-plan/invest-more` | POST | Yes | planId, category, productId, amount, orderLinkId | accountType |
| Redeem | `/v5/earn/pwm/investment-plan/redeem` | POST | Yes | planId, category, productId, orderLinkId | amount, shares, positionId |
| Claim | `/v5/earn/pwm/investment-plan/claim` | POST | Yes | planId, orderLinkId | toAccountType |
| Asset Trend | `/v5/earn/pwm/investment-plan/asset-trend` | GET | Yes | planId | startTime, endTime |
| Fund NAV | `/v5/earn/pwm/investment-plan/fund-nav` | GET | Yes | fundId | startTime, endTime |
| Order List | `/v5/earn/pwm/investment-plan/order` | GET | Yes | — | planId, category, type, status, startTime, endTime, limit, cursor, orderLinkId |
| Product Cards | `/v5/earn/pwm/customize-plan/product` | GET | No | — | — |
| Create Custom Plan | `/v5/earn/pwm/customize-plan/create` | POST | Yes | products[], orderLinkId | accountType |

> **Notes**:
> - Plan status lifecycle: `PendingSubscription` → `Active` → `Closed`.
> - `category` values: `multiCoinEarning`, `fixedYield`, `equityFund`, `onchainEarn`.
> - `accountType`: `FUND` (default), `UNIFIED`.
> - Redeem uses `shares` for `equityFund` category, `amount` for others.

### PWM — Institutional Side

| Endpoint | Path | Method | Auth | Required | Optional |
|----------|------|--------|------|----------|----------|
| List Funds | `/v5/earn/pwm/asset-manager/all-funds` | GET | Yes | — | — |
| Create Fund | `/v5/earn/pwm/asset-manager/create-fund` | POST | Yes | fundName, coin, profitShareRate, managementFeeRate, reqLinkId | — |
| Settle Profit | `/v5/earn/pwm/asset-manager/settle-profit` | POST | Yes | fundId, reqLinkId | — |
| Create Investment Plan | `/v5/earn/pwm/asset-manager/create-investment-plan` | POST | Yes | accountUid, planName, planType, investmentDistribution[], reqLinkId | — |
| Get Plans | `/v5/earn/pwm/asset-manager/get-investment-plan` | GET | Yes | — | — |
| Manage Plan | `/v5/earn/pwm/asset-manager/manage-investment-plan` | POST | Yes | planId, reqLinkId | updateStatus, updateFunds[] |
| List Orders | `/v5/earn/pwm/asset-manager/all-order` | GET | Yes | — | — |
| Manage Order | `/v5/earn/pwm/asset-manager/manage-order` | POST | Yes | orderId, action, reqLinkId | — |
| Create Sub-Account | `/v5/earn/pwm/asset-manager/create-sub-account` | POST | Yes | fundId, reqLinkId | — |
| Fund Transfer | `/v5/earn/pwm/fund-transfer` | POST | Yes | transferId, fromUserId, toUserId, amount, coin | — |
| Transfer Records | `/v5/earn/pwm/query-fund-transfer-result` | GET | Yes | — | transferId, fromUserId |

> **Notes**:
> - Fund status lifecycle: `PendingSubscribe` → `Active` → `Closing` → `Closed`.
> - Supported `coin`: BTC, ETH, USDT, USDC, SOL, MNT, XRP.
> - `action` values: `Approve`, `Reject`.
> - `planType`: `stable`, `advanced`.
> - `reqLinkId` max 36 chars, used for idempotency.
