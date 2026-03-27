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

User might say: "Show me dual asset products", "Stake BTC in dual assets", "Check my dual assets position", "What APY can I get on BTC sell high"

> Dual Assets is a **structured product** with fixed duration and settlement. Users choose a direction (BuyLow or SellHigh) and target price. If price reaches target at settlement, the trade executes; otherwise, principal + yield is returned. **Quotes expire quickly** — always get fresh quotes before placing orders.

**View products** (no auth)
```
GET /v5/earn/advance/product?category=DualAssets
```
> Optional: `coin`(e.g. BTC), `duration`(e.g. 8h, 1d, 3d, 6d, 12d). Returns product list with `productId`, `baseCoin`, `quoteCoin`, `duration`, `status`(Available/NotAvailable), `isVipProduct`, subscription/settlement times, min purchase amounts, remaining quotas, precision.

**Get real-time quotes** (no auth)
```
GET /v5/earn/advance/product-extra-info?category=DualAssets&productId=81749
```
> Returns `currentPrice`, `buyLowPrice[]` and `sellHighPrice[]` arrays. Each quote has: `selectPrice`, `apyE8`, `maxInvestmentAmount`, `expiredAt`. **Tip**: Use WebSocket `earn.dualassets.offers` on `wss://stream.bybit.com/v5/public/fp` for real-time updates instead of polling.

**Place order**
```
POST /v5/earn/advance/place-order
{"category":"DualAssets","productId":81749,"orderType":"Stake","amount":"20","accountType":"FUND","coin":"USDT","orderLinkId":"unique-id-003","dualAssetsExtra":{"orderDirection":"BuyLow","selectPrice":"69500","apyE8":855000000}}
```
> All 8 params required. `dualAssetsExtra` is a nested object with `orderDirection`(BuyLow/SellHigh), `selectPrice`, `apyE8` — **must match a valid quote**. Stale quotes are rejected. `orderLinkId` provides idempotency (30-min window). Order is **async** — use Get Order to track status. Rate limit: 5 req/s.
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
