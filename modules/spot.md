# Module: Spot Trading

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Spot Trading

User might say: "Buy 500U of BTC", "Sell all my ETH", "Place a limit order"

**Market buy** (recommended: use quoteCoin to specify USDT amount)
```
POST /v5/order/create
{"category":"spot","symbol":"BTCUSDT","side":"Buy","orderType":"Market","qty":"500","marketUnit":"quoteCoin"}
```

**Market sell** (use baseCoin to specify coin quantity)
```
POST /v5/order/create
{"category":"spot","symbol":"ETHUSDT","side":"Sell","orderType":"Market","qty":"2.5"}
```

**Limit buy**
```
POST /v5/order/create
{"category":"spot","symbol":"BTCUSDT","side":"Buy","orderType":"Limit","qty":"0.01","price":"80000","timeInForce":"GTC"}
```

**View open orders**
```
GET /v5/order/realtime?category=spot&symbol=BTCUSDT
```

**Cancel order**
```
POST /v5/order/cancel
{"category":"spot","symbol":"BTCUSDT","orderId":"xxx"}
```

> **Important**: For spot market buy orders, using `marketUnit=quoteCoin` + USDT amount is recommended over specifying coin quantity — it is more reliable.

---

## API Reference

### Trade (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Rate Limit | Categories |
|----------|------|--------|----------------|-----------------|------------|------------|
| Place Order | `/v5/order/create` | POST | category, symbol, side, orderType, qty | price, timeInForce, orderLinkId, triggerPrice, takeProfit, stopLoss, tpslMode, reduceOnly, positionIdx, marketUnit... | 10-20/s | spot, linear, inverse, option |
| Amend Order | `/v5/order/amend` | POST | category, symbol | orderId/orderLinkId, qty, price, takeProfit, stopLoss, triggerPrice | 10/s | spot, linear, inverse, option |
| Cancel Order | `/v5/order/cancel` | POST | category, symbol | orderId/orderLinkId, orderFilter | 10-20/s | spot, linear, inverse, option |
| Get Open Orders | `/v5/order/realtime` | GET | category | symbol, baseCoin, orderId, orderLinkId, openOnly, limit, cursor | 50/s | spot, linear, inverse, option |
| Cancel All Orders | `/v5/order/cancel-all` | POST | category | symbol, baseCoin, settleCoin, orderFilter, stopOrderType | 10/s | spot, linear, inverse, option |
| Order History | `/v5/order/history` | GET | category | symbol, orderId, orderLinkId, orderFilter, orderStatus, startTime, endTime, limit, cursor | 50/s | spot, linear, inverse, option |
| Batch Place Order | `/v5/order/create-batch` | POST | category, request[] | — | per-order | spot, linear, inverse, option |
| Batch Amend Order | `/v5/order/amend-batch` | POST | category, request[] | — | per-order | spot, linear, inverse, option |
| Batch Cancel Order | `/v5/order/cancel-batch` | POST | category, request[] | — | per-order | spot, linear, inverse, option |
| Spot Borrow Check | `/v5/order/spot-borrow-check` | GET | category, symbol, side | — | — | spot |
| Pre-check | `/v5/order/pre-check` | POST | (same as create) | — | — | spot, linear, inverse, option |
| DCP | `/v5/order/disconnected-cancel-all` | POST | timeWindow | — | — | option |

### Spot Margin (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Switch Margin Mode | `/v5/spot-margin-trade/switch-mode` | POST | spotMarginMode | — | spot |
| Set Spot Leverage | `/v5/spot-margin-trade/set-leverage` | POST | leverage | — | spot |
| VIP Margin Data | `/v5/spot-margin-trade/data` | GET | — | — | spot |
| Interest Rate History | `/v5/spot-margin-trade/interest-rate-history` | GET | currency | startTime, endTime, vipLevel | spot |
| Margin Status | `/v5/spot-margin-trade/state` | GET | — | — | spot |
| ~~Cross Margin Loan Info~~ | `/v5/spot-cross-margin-trade/loan-info` | GET | — | coin | **Deprecated (pre-UTA)** |
| ~~Cross Margin Account~~ | `/v5/spot-cross-margin-trade/account` | GET | — | — | **Deprecated (pre-UTA)** |
| ~~Borrow~~ | `/v5/spot-cross-margin-trade/loan` | POST | coin, qty | — | **Deprecated → `/v5/account/borrow`** |
| ~~Repay~~ | `/v5/spot-cross-margin-trade/repay` | POST | coin, qty | — | **Deprecated → `/v5/account/repay`** |
| ~~Cross Margin Switch~~ | `/v5/spot-cross-margin-trade/switch` | POST | switch | — | **Deprecated (pre-UTA)** |
| Coin Status | `/v5/spot-margin-trade/coinstate` | GET | — | currency | spot |
| Tiered Collateral Rate | `/v5/spot-margin-trade/collateral` | GET | — | currency | spot |
| Auto Repay Mode | `/v5/spot-margin-trade/get-auto-repay-mode` | GET | — | — | spot |
| Set Auto Repay | `/v5/spot-margin-trade/set-auto-repay-mode` | POST | — | — | spot |
| Max Borrowable | `/v5/spot-margin-trade/max-borrowable` | GET | — | coin | spot |
| Position Tiers | `/v5/spot-margin-trade/position-tiers` | GET | — | — | spot |
| Repayable Amount | `/v5/spot-margin-trade/repayment-available-amount` | GET | — | — | spot |

### Leverage Token

| Endpoint | Path | Method | Required Params | Optional Params | Auth | Categories |
|----------|------|--------|----------------|-----------------|------|------------|
| LT Info | `/v5/spot-lever-token/info` | GET | — | ltCoin | No | spot |
| LT Tickers | `/v5/spot-lever-token/reference` | GET | ltCoin | — | No | spot |
| Purchase | `/v5/spot-lever-token/purchase` | POST | ltCoin, ltAmount | serialNo | Yes | spot |
| Redeem | `/v5/spot-lever-token/redeem` | POST | ltCoin, ltAmount | serialNo | Yes | spot |
| Order Record | `/v5/spot-lever-token/order-record` | GET | — | ltCoin, orderId, startTime, endTime, limit, ltOrderType, serialNo | Yes | spot |

## Enums

* **side**: `Buy` | `Sell`
* **orderType**: `Market` | `Limit`
* **timeInForce**: `GTC` | `IOC` | `FOK` | `PostOnly` | `RPI`
* **orderStatus (open)**: `New` | `PartiallyFilled` | `Untriggered`
* **orderStatus (closed)**: `Rejected` | `PartiallyFilledCanceled` | `Filled` | `Cancelled` | `Triggered` | `Deactivated`
* **spotMarginMode**: `0` (off) | `1` (on)
* **marketUnit**: `baseCoin` | `quoteCoin` (spot market buy only)
