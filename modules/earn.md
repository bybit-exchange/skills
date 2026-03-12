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
POST /v5/earn/place-order
{"category":"FlexibleSaving","coin":"USDT","amount":"1000"}
```
> Get available products from the product list first to confirm coin and category.

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
{"category":"FlexibleSaving","coin":"USDT","amount":"500"}
```

---

## API Reference

### Earn (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Product v2 | `/v5/earn/product` | GET | category | coin | **Recommended** |
| Place Order v2 | `/v5/earn/place-order` | POST | category, coin, amount | orderLinkId | **Recommended** |
| Query Order v2 | `/v5/earn/order` | GET | category | orderId, orderLinkId, productId, startTime, endTime, limit, cursor | **Recommended** |
| Yield v2 | `/v5/earn/yield` | GET | category | productId, startTime, endTime, limit, cursor | **Recommended** |
| Hourly Yield | `/v5/earn/hourly-yield` | GET | category | productId, startTime, endTime, limit, cursor | **Recommended** |

## Enums

* **earnOrderType**: `Subscribe` | `Redeem` (Note: older docs may reference `Stake`; use `Subscribe` for V2 Earn API)
* **earn category**: `FlexibleSaving` | `FixedDeposit` | `Launchpool` | etc.
