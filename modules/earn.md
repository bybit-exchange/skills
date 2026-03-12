# Module: Earn

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Earn Products

User might say: "Show me available earn products", "Deposit USDT", "Redeem"

**View product list**
```
GET /v5/earn/product?category=FlexibleSaving&coin=USDT
```

**Subscribe**
```
POST /v5/earn/create-order
{"productId":"xxx","amount":"1000","orderType":"Subscribe","accountType":"UNIFIED"}
```
> Get `productId` from the product response.

**View holdings**
```
GET /v5/earn/position?coin=USDT
```

**View yield history**
```
GET /v5/earn/yield-history?coin=USDT
```

**Redeem**
```
POST /v5/earn/create-order
{"productId":"xxx","amount":"500","orderType":"Redeem","accountType":"UNIFIED"}
```

---

## API Reference

### Earn (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| ~~Product Info~~ | `/v5/earn/product-info` | GET | — | category, coin | **Deprecated → use v2** |
| ~~Subscribe/Redeem~~ | `/v5/earn/create-order` | POST | productId, amount, orderType | serialNo, accountType | **Deprecated → use v2** |
| ~~Position~~ | `/v5/earn/position` | GET | — | productId, coin, category | **Deprecated → use v2** |
| ~~Order History~~ | `/v5/earn/order-history` | GET | — | productId, orderId, startTime, endTime, limit, cursor | **Deprecated → use v2** |
| ~~Yield History~~ | `/v5/earn/yield-history` | GET | — | productId, coin, startTime, endTime, limit, cursor | **Deprecated → use v2** |
| Product v2 | `/v5/earn/product` | GET | category | coin | **Recommended** |
| Place Order v2 | `/v5/earn/place-order` | POST | category, coin, amount | orderLinkId | **Recommended** |
| Query Order v2 | `/v5/earn/order` | GET | category | orderId, orderLinkId, productId, startTime, endTime, limit, cursor | **Recommended** |
| Yield v2 | `/v5/earn/yield` | GET | category | productId, startTime, endTime, limit, cursor | **Recommended** |
| Hourly Yield | `/v5/earn/hourly-yield` | GET | category | productId, startTime, endTime, limit, cursor | **Recommended** |

## Enums

* **earnOrderType**: `Subscribe` | `Redeem` (Note: older docs may reference `Stake`; use `Subscribe` for V2 Earn API)
* **earn category**: `FlexibleSaving` | `FixedDeposit` | `Launchpool` | etc.
