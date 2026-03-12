# Module: Derivatives Trading

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Derivatives Trading

User might say: "Open a BTC long with 10x leverage", "Close position", "Set take profit at 90000"

**Pre-trade preparation**
```bash
# 1. Check current account mode
GET /v5/account/info
# Returns marginMode: REGULAR_MARGIN / ISOLATED_MARGIN / PORTFOLIO_MARGIN

# 2. Detect position mode (MUST do before any write operation)
POST /v5/position/switch-mode
{"category":"linear","coin":"USDT","mode":0}
# If retCode=0 → was in hedge mode, now switched to one-way (positionIdx=0)
# If retCode=110025 "Position mode is not modified" → already one-way (positionIdx=0)
# If you want to KEEP hedge mode, skip this call and use positionIdx=1 (long) / 2 (short)

# 3. Set leverage (buy and sell leverage must match)
POST /v5/position/set-leverage
{"category":"linear","symbol":"BTCUSDT","buyLeverage":"10","sellLeverage":"10"}
```

> **Position mode detection**: Always detect position mode before placing the first order in a session. Cache the result (one-way vs hedge) and use the correct `positionIdx` for all subsequent orders. One-way mode: `positionIdx=0`. Hedge mode: `positionIdx=1` (long), `positionIdx=2` (short).

**Open long**
```
POST /v5/order/create
{"category":"linear","symbol":"BTCUSDT","side":"Buy","orderType":"Market","qty":"0.01","positionIdx":0}
# positionIdx=0 for one-way mode; use 1 for hedge mode long
```

**Open short**
```
POST /v5/order/create
{"category":"linear","symbol":"BTCUSDT","side":"Sell","orderType":"Market","qty":"0.01","positionIdx":0}
# positionIdx=0 for one-way mode; use 2 for hedge mode short
```

**Open position with take profit and stop loss**
```
POST /v5/order/create
{"category":"linear","symbol":"BTCUSDT","side":"Buy","orderType":"Market","qty":"0.01",
 "takeProfit":"90000","stopLoss":"78000","tpslMode":"Full"}
```

**View positions**
```
GET /v5/position/list?category=linear&symbol=BTCUSDT
```

**Close position (recommended: query size first, then close)**
```bash
# 1. Query actual position size
GET /v5/position/list?category=linear&symbol=BTCUSDT
# Read "size" from response to get exact position quantity

# 2. Close with exact quantity
POST /v5/order/create
{"category":"linear","symbol":"BTCUSDT","side":"Sell","orderType":"Market","qty":"<size_from_step_1>","reduceOnly":true,"positionIdx":0}
```
> **Shortcut**: On Bybit V5 linear/inverse, `qty="0"` + `reduceOnly=true` closes the entire position. Use this only when you're confident the symbol supports it. The query-first approach is safer and works across all categories.

**Modify take profit / stop loss**
```
POST /v5/position/trading-stop
{"category":"linear","symbol":"BTCUSDT","takeProfit":"92000","stopLoss":"79000","tpslMode":"Full","positionIdx":0}
```

**Hedge mode handling**:
- If an order returns `retCode=10001` "position idx not match position mode", the account is in hedge mode
- Use `positionIdx=1` for long, `positionIdx=2` for short
- Remember the account is in hedge mode and automatically include positionIdx in subsequent orders

> **Category confirmation**: When the user says "BTCUSDT", you must confirm whether they mean spot or derivatives — do not assume.

---

## Scenario: Conditional Orders & Advanced Orders

User might say: "Buy BTC when it hits 85000", "Set a trailing stop"

**Conditional order (trigger price order)**
```
POST /v5/order/create
{"category":"linear","symbol":"BTCUSDT","side":"Buy","orderType":"Market","qty":"0.01",
 "triggerPrice":"85000","triggerDirection":2,"triggerBy":"LastPrice"}
```

> `triggerDirection` is **required** for conditional orders:
> - `1` = triggered when price **rises** to triggerPrice (triggerPrice > current price)
> - `2` = triggered when price **falls** to triggerPrice (triggerPrice < current price)
>
> Rule of thumb: buying the dip → `triggerDirection=2`; breakout buy → `triggerDirection=1`.

**Trailing stop**
```
POST /v5/position/trading-stop
{"category":"linear","symbol":"BTCUSDT","trailingStop":"500","activePrice":"88000","positionIdx":0}
```
> trailingStop="500" means the stop triggers when price retraces by $500. activePrice is the activation price (tracking begins only after this price is reached).

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

### Position (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Get Position | `/v5/position/list` | GET | category | symbol, baseCoin, settleCoin, limit, cursor | linear, inverse, option |
| Set Leverage | `/v5/position/set-leverage` | POST | category, symbol, buyLeverage, sellLeverage | — | linear, inverse |
| ~~Switch Isolated/Cross~~ | `/v5/position/switch-isolated` | POST | category, symbol, tradeMode, buyLeverage, sellLeverage | — | **Deprecated → use `/v5/account/set-margin-mode`** |
| Switch Position Mode | `/v5/position/switch-mode` | POST | category, mode | coin, symbol | linear, inverse |
| ~~Set Risk Limit~~ | `/v5/position/set-risk-limit` | POST | category, symbol, riskId | — | **Deprecated (UTA auto-manages risk limit)** |
| Set Trading Stop | `/v5/position/trading-stop` | POST | category, symbol, tpslMode, positionIdx | takeProfit, stopLoss, trailingStop, tpTriggerBy, slTriggerBy, activePrice, tpSize, slSize, tpLimitPrice, slLimitPrice | linear, inverse |
| Set Auto Add Margin | `/v5/position/set-auto-add-margin` | POST | category, symbol, autoAddMargin | positionIdx | linear, inverse |
| Add/Reduce Margin | `/v5/position/add-margin` | POST | category, symbol, margin | positionIdx | linear, inverse |
| Move Position | `/v5/position/move-positions` | POST | fromUid, toUid, list[] | — | linear, inverse |
| Move Position History | `/v5/position/move-history` | GET | — | category, symbol, startTime, endTime, status, limit, cursor | linear, inverse |
| Execution History | `/v5/execution/list` | GET | category | symbol, baseCoin, orderId, startTime, endTime, execType, limit, cursor | spot, linear, inverse, option |
| Closed PnL | `/v5/position/closed-pnl` | GET | category, symbol | startTime, endTime, limit, cursor | linear, inverse |
| Closed Options | `/v5/position/get-closed-positions` | GET | category | symbol, limit, cursor | option |
| Confirm Pending MMR | `/v5/position/confirm-pending-mmr` | POST | category, symbol | — | linear, inverse |

## Enums

* **positionIdx**: `0` (one-way) | `1` (hedge-buy) | `2` (hedge-sell)
* **positionMode**: `0` (MergedSingle / one-way) | `3` (BothSide / hedge)
* **tradeMode**: `0` (cross margin) | `1` (isolated margin)
* **triggerBy**: `LastPrice` | `IndexPrice` | `MarkPrice`
* **tpslMode**: `Full` | `Partial`
* **stopOrderType**: `TakeProfit` | `StopLoss` | `TrailingStop` | `Stop` | `PartialTakeProfit` | `PartialStopLoss` | `tpslOrder` | `OcoOrder`
* **execType**: `Trade` | `AdlTrade` | `Funding` | `BustTrade` | `Delivery` | `Settle` | `BlockTrade` | `MovePosition`
* **setMarginMode**: `ISOLATED_MARGIN` | `REGULAR_MARGIN` | `PORTFOLIO_MARGIN`
* **autoAddMargin**: `0` (off) | `1` (on)

## Take Profit / Stop Loss Parameters

| Parameter | Description |
|-----------|-------------|
| takeProfit | Take profit price (pass `"0"` to cancel) |
| stopLoss | Stop loss price (pass `"0"` to cancel) |
| tpslMode | `Full` (entire position) `Partial` (partial) |
| tpOrderType | Order type when TP triggers: `Market` (default) `Limit` |
| slOrderType | Order type when SL triggers: `Market` (default) `Limit` |
| trailingStop | Trailing stop distance (pass `"0"` to cancel) |
| activePrice | Trailing stop activation price |
