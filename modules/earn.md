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
* **earn category**: `FlexibleSaving` | `OnChain`
