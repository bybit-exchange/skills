# Module: Earn

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

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

## Enums

* **orderType**: `Stake` | `Redeem`
* **accountType**: `FUND` | `UNIFIED` (OnChain only supports FUND)
* **earn category**: `FlexibleSaving` | `OnChain` | `DualAssets` (Advance Earn)

---

## Scenario: Advance Earn (Dual Assets)

User might say: "Show me dual asset products", "Stake BTC in dual assets", "Check my dual assets position", "What APY can I get on BTC sell high", "Help me join BTC dual assets", "Dual assets", "BTC dual assets"

> Dual Assets is a **structured product** with fixed duration and settlement. Users choose a direction (**BuyLow** or **SellHigh**) and target price. If price reaches target at settlement, the trade executes; otherwise, principal + yield is returned.
>
> **⚠️ Direction selection is required**:
> - **BuyLow**: Invest USDT; if BTC price is below the strike price at expiry, BTC is purchased at the strike price. Suitable for users who want to buy BTC at a lower price.
> - **SellHigh**: Invest BTC; if BTC price is above the strike price at expiry, BTC is sold at the strike price. Suitable for users who want to sell BTC at a higher price.
>
> When the user has not specified a direction, **you must first ask the user to choose BuyLow or SellHigh** before proceeding with the remaining flow.
>
> **⚠️ Quote Expiry Warning**: Quotes expire quickly — always get fresh quotes immediately before placing orders. Never use cached or previously retrieved quotes. Each quote has an `expiredAt` field (expiration time) — **always check `expiredAt` before using any quote**, and always inform the user of the quote's expiration time so they are aware of the time sensitivity.

**⚠️ Mandatory pre-order flow**

> When a user requests to place a Dual Assets order (BuyLow or SellHigh), you **must** follow this sequence and **must mention quote expiry (`expiredAt` / expiration time) to the user**:
>
> 1. **Ask for direction**: If the user has not specified `BuyLow` or `SellHigh` (direction), ask them to choose before proceeding.
> 2. Call `GET /v5/earn/advance/product?category=DualAssets` to find the matching `productId`
> 3. Call `GET /v5/earn/advance/product-extra-info?category=DualAssets&productId=<id>` to get **real-time quotes**
> 4. **⚠️ Check `expiredAt` (quote expiration time)**: Check each quote's `expiredAt` field — **only use a quote whose `expiredAt` has not passed**. Tell the user: "Quotes have an expiration time limit. Each quote has an `expiredAt` expiration time — please confirm your order before the quote expires." Always inform the user of the `expiredAt` (expiration time) of the selected quote so they know how long the quote is valid.
> 5. Extract `selectPrice` and `apyE8` from the chosen quote and include them in the place-order request
> 6. Place the order via `POST /v5/earn/advance/place-order`
>
> **Never skip steps 3–4.** Stale quotes (past `expiredAt`) will be rejected by the API. The `expiredAt` expiration time must always be communicated to the user.

**View products** (no auth)
```
GET /v5/earn/advance/product?category=DualAssets
```
> Optional: `coin`(e.g. BTC), `duration`(e.g. 8h, 1d, 3d, 6d, 12d). Returns product list with `productId`, `baseCoin`, `quoteCoin`, `duration`, `status`(Available/NotAvailable), `isVipProduct`, subscription/settlement times, min purchase amounts, remaining quotas, precision.

**Get real-time quotes** (no auth)
```
GET /v5/earn/advance/product-extra-info?category=DualAssets&productId=81749
```
> Returns `currentPrice`, `buyLowPrice[]` and `sellHighPrice[]` arrays. Each quote has: `selectPrice`, `apyE8`, `maxInvestmentAmount`, `expiredAt` (quote expiration time). **⚠️ Quotes expire quickly** — check `expiredAt` before using any quote. If a quote's `expiredAt` is in the past, it is stale and must not be used. **Always inform the user of the quote's `expiredAt` (expiration time)** so they know how long the quote is valid and can confirm the order before it expires. **Tip**: Use WebSocket `earn.dualassets.offers` on `wss://stream.bybit.com/v5/public/fp` for real-time updates instead of polling.

**Place order**
```
POST /v5/earn/advance/place-order
{"category":"DualAssets","productId":81749,"orderType":"Stake","amount":"20","accountType":"FUND","coin":"USDT","orderLinkId":"unique-id-003","dualAssetsExtra":{"orderDirection":"BuyLow","selectPrice":"69500","apyE8":855000000}}
```
> All 8 params required. `dualAssetsExtra` is a nested object with `orderDirection`(BuyLow/SellHigh), `selectPrice`, `apyE8` — **must match a valid, non-expired quote** (verify `expiredAt` before submitting). Stale quotes are rejected. `orderLinkId` provides idempotency. Order is **async** — use Get Order to track status. Rate limit: 5 req/s.
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

### Advance Earn API Reference

| Endpoint | Path | Method | Auth | Rate Limit | Required Params | Optional Params |
|----------|------|--------|------|------------|----------------|-----------------|
| Product List | `/v5/earn/advance/product` | GET | No | 50/s (IP) | category(DualAssets) | coin, duration |
| Product Quotes | `/v5/earn/advance/product-extra-info` | GET | No | 50/s (IP) | category, productId | — |
| Place Order | `/v5/earn/advance/place-order` | POST | Yes | 5/s (UID) | category, productId, orderType, amount, accountType, coin, orderLinkId, dualAssetsExtra | interestCard |
| Position | `/v5/earn/advance/position` | GET | Yes | 10/s (UID) | category(DualAssets) | productId, coin, limit, cursor |
| Order History | `/v5/earn/advance/order` | GET | Yes | 10/s (UID) | category(DualAssets) | productId, orderId, orderLinkId, startTime, endTime, limit, cursor |


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
> No auth required. Returns `productId`(integer), `coin`, `mintFeeRateE8`, `redeemFeeRateE8`, `minInvestment`, `userHolding`, `leftQuota`, `canMint`(whether the user can currently mint, based on remaining quota), `savingsBalance`(user's FlexibleSaving USDT balance), `aprE8`, `bonusAprE8`, `bonusMaxAmount`, `baseCoinPrecision`, `tokenPrecision`.

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