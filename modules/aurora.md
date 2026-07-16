# Module: Aurora

> This module is loaded on-demand for Aurora AI strategy recommendations. Authentication required.

## Scenario: Aurora AI Strategy Recommendations

User might say: "Recommend a grid bot for BTC", "Show me the trading-bot home picks", "What's a good futures-grid strategy right now", "One-click create a long BTC bot", "Refetch this Aurora strategy"

---

## Response Format

Aurora endpoints use the **same response format as Trading Bot** (not the standard V5 `retCode/retMsg`):

```json
{"status_code": 200, "debug_msg": "", "data": {...}}
```

> **Note**: Uses `status_code`/`debug_msg`. `status_code=200` means success. `data` may be a single `AIParamsStrategy` or an array, depending on endpoint.

---

## Aurora AI Params

All endpoints below are **POST**, require authentication, and share a rate limit of **20 qps per UID per path**.

### Get Strategy

Refetch a previously recommended strategy by its `aurora_id`.

```
POST /v5/aurora/info
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| aurora_id | string | Y | Encoded strategy ID returned by any recommendation endpoint |

**Response**: `data` is a single `AIParamsStrategy` (see [Strategy Object](#strategy-object-aiparamsstrategy)).

> **Workflow**: Get `aurora_id` from `/v5/aurora/home`, `/creation`, `/explore`, or `/easy` first.

### Home-Page Recommendations

Curated picks for the trading-bot home feed. Returns up to 18 strategies mixed across bot types.

```
POST /v5/aurora/home
```

**Body**: empty `{}` — personalization is server-side based on the authenticated UID.

**Response**: `data` is an array of up to 18 `AIParamsStrategy`. For Copy Trading leaders, only the first 6 futures-grid strategies are returned.

> Use this when the user opens the trading-bot home and wants Aurora's picks without specifying anything.

### Creation-Page Recommendations

Recommendations narrowed by `biz_type` + `symbol`. Returns up to 6 strategies plus a recommended market direction.

```
POST /v5/aurora/creation
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| biz_type | integer | Y | See [Business enum](#business-enum). Common: `1` SPOT_GRID, `2` FUTURE_GRID, `7` FUTURE_MARTIN, `8` FUTURE_COMBO |
| symbol | string | Y | Trading pair, e.g. `BTCUSDT` |

**Response**:

| Field | Type | Description |
|-------|------|-------------|
| market_mode | integer | Aurora's recommended direction. See [GridMode enum](#gridmode-enum) |
| data | array | Up to 6 `AIParamsStrategy` |

> Use this in the bot-creation flow when both bot type and symbol are known. `market_mode` should pre-select the long/short/neutral toggle.

### Explore-Page Recommendations

Recommendations filtered by `biz_type` only. Returns up to 6 strategies spanning multiple symbols.

```
POST /v5/aurora/explore
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| biz_type | integer | Y | See [Business enum](#business-enum) |

**Response**: `data` is an array of up to 6 `AIParamsStrategy`.

> Use this when the user is browsing strategies for a bot type without committing to a symbol.

### EasyBot Recommendation

One-click recommendation for the simplified creation flow.

```
POST /v5/aurora/easy
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Y | Trading pair (can be a multi-token symbol for combo) |
| product | integer | Y | See [ProductType enum](#producttype-enum). `1` spot, `2` futures |
| direction | integer | Y | See [GridMode enum](#gridmode-enum). `1` neutral, `2` long, `3` short |

**Response**:

| Field | Type | Description |
|-------|------|-------------|
| biz | integer | Bot type Aurora picked. See [Business enum](#business-enum) — feed into the matching create endpoint |
| data | object | Single `AIParamsStrategy` |

> Use this for the one-click "let Aurora pick everything" flow. The returned `biz` tells you which bot create endpoint to call next (e.g. `biz=1` → `/v5/grid/create-grid`, `biz=2` → `/v5/fgridbot/create`).

---

## Strategy Object: AIParamsStrategy

Returned by every Aurora endpoint as `data` (or `data[]`). Combines symbol info, backtest metrics, and one bot-type-specific params block.

| Field | Type | Description |
|-------|------|-------------|
| base_coin | string | e.g. `BTC` |
| quote_coin | string | e.g. `USDT` |
| symbol | string | e.g. `BTCUSDT` |
| estimate_profits_days | integer | Backtest horizon (days) |
| estimate_profits_rate_e4 | integer | Total profit rate scaled by 1e4. `actual = field / 10000` |
| estimate_profits_apr_e4 | integer | Annualized profit rate scaled by 1e4 |
| yield_trend_list | array | 14-day backtest curve. Each item: `{stat_time: int (epoch sec), yield_rate_e4: int}` |
| max_draw_down_rate_e4 | integer | Maximum drawdown scaled by 1e4 |
| atr_e4 | integer | ATR volatility scaled by 1e4 |
| sell_cnt | integer | Backtested arbitrage (round-trip) count |
| style | integer | See [BotStyle enum](#botstyle-enum) |
| biz_type | integer | See [Business enum](#business-enum) — determines which params block is populated |
| grid_mode | integer | See [GridMode enum](#gridmode-enum) |
| sharpe_ratio_e4 | integer | Sharpe ratio scaled by 1e4 |
| spot_bot | object | Present iff `biz_type=1`. See [SpotBotParam](#spotbotparam) |
| fgrid_bot | object | Present iff `biz_type=2`. See [FGridBotParam](#fgridbotparam) |
| fmartin_bot | object | Present iff `biz_type=7`. See [FMartinBotParam](#fmartinbotparam) |
| fcombo_bot | object | Present iff `biz_type=8`. See [FComboBotParam](#fcombobotparam) |
| aurora_id | string | Encoded ID — pass to `/v5/aurora/info` to refetch |

> **Note**: Exactly one of `spot_bot` / `fgrid_bot` / `fmartin_bot` / `fcombo_bot` is populated per strategy. Check `biz_type` to know which.

### SpotBotParam

| Field | Type | Description |
|-------|------|-------------|
| upper_price | string | Upper grid bound (decimal string for precision) |
| lower_price | string | Lower grid bound |
| grid_num | integer | Number of grid cells |

### FGridBotParam

| Field | Type | Description |
|-------|------|-------------|
| lower_price | string | Lower grid bound |
| upper_price | string | Upper grid bound |
| grid_num | integer | Number of grid cells |
| leverage_e2 | integer | Leverage scaled by 1e2. `actual = field / 100` |

### FMartinBotParam

| Field | Type | Description |
|-------|------|-------------|
| profit_target_rate | string | Take-profit target |
| open_limit_rate | string | Price drop/rise rate that triggers add-position |
| max_open_count | integer | Maximum add-position rounds |
| open_amount_multipler | string | Per-round position-size multiplier |
| leverage_e2 | integer | Leverage scaled by 1e2 |

### FComboBotParam

| Field | Type | Description |
|-------|------|-------------|
| tokens | array | Each item: `{base_coin, quote_coin, symbol, ratio_e2 (int, /100=percent), mode (GridMode)}` |
| leverage | integer | Portfolio leverage |
| resize_time | integer | Rebalance interval in **minutes** |
| resize_ratio_e2 | integer | Rebalance trigger deviation scaled by 1e2 |

---

## Enums

### Business enum

| Value | Constant | Meaning |
|-------|----------|---------|
| 0 | BIZ_UNKNOWN | Unspecified |
| 1 | SPOT_GRID | Spot grid |
| 2 | FUTURE_GRID | Futures grid |
| 3 | SPOT_DCA | DCA |
| 4 | DUAL_ASSET | Dual asset |
| 5 | LIQUIDITY_MINING | Liquidity mining |
| 6 | COPY_TRADING | Copy trading |
| 7 | FUTURE_MARTIN | Futures martingale |
| 8 | FUTURE_COMBO | Futures combo |

### GridMode enum

| Value | Constant | Meaning |
|-------|----------|---------|
| 0 | GRID_MODE_UNSPECIFIED | Unspecified |
| 1 | GRID_MODE_NEUTRAL | Neutral |
| 2 | GRID_MODE_LONG | Long-biased |
| 3 | GRID_MODE_SHORT | Short-biased |

### BotStyle enum

| Value | Constant | Meaning |
|-------|----------|---------|
| 0 | STYLE_UNSPECIFIED | Unspecified |
| 1 | STYLE_HIGH_PROFITS | High profit |
| 2 | STYLE_STEADY | Steady |
| 3 | STYLE_HIGH_FREQUENCY | High frequency |

### ProductType enum

| Value | Constant | Meaning |
|-------|----------|---------|
| 0 | PRODUCT_TYPE_UNKNOWN | Unspecified |
| 1 | PRODUCT_TYPE_SPOT | Spot |
| 2 | PRODUCT_TYPE_FUTURE | Futures |

---

## Scaling Factor Convention

Fields with the `_e2` / `_e4` suffix are **integers carrying scaled values**:

- `_e2` → divide by **100** to get the real value (e.g. `leverage_e2=500` means leverage **5.0x**)
- `_e4` → divide by **10000** to get the real value (e.g. `estimate_profits_apr_e4=8300` means APR **0.83**, i.e. **83%**)

This avoids float precision loss over the wire. Always rescale before showing to the user.

---

## Typical Agent Workflow

1. **Discovery** — call `/v5/aurora/home` (no params) or `/v5/aurora/explore` (`biz_type` only) to surface candidate strategies
2. **Drill-down** — when the user picks a symbol, call `/v5/aurora/creation` with `biz_type + symbol` for refined picks plus a recommended `market_mode`
3. **One-click** — for the simplest flow, use `/v5/aurora/easy` with `symbol + product + direction`; the response's `biz` tells you which create endpoint to chain into
4. **Refetch** — store `aurora_id` from any strategy and call `/v5/aurora/info` later to refresh metrics
5. **Act** — feed the chosen strategy's params block into the matching Trading Bot create endpoint:
   - `biz_type=1` (SPOT_GRID) + `spot_bot` → `POST /v5/grid/create-grid`
   - `biz_type=2` (FUTURE_GRID) + `fgrid_bot` → `POST /v5/fgridbot/create`
   - `biz_type=7` (FUTURE_MARTIN) + `fmartin_bot` → `POST /v5/fmartingalebot/create`
   - `biz_type=8` (FUTURE_COMBO) + `fcombo_bot` → `POST /v5/fcombobot/create`

---

## Notes

- All endpoints are **POST** and require authentication
- All endpoints share a **20 qps per UID per path** rate limit
- All response payloads use `status_code` / `debug_msg` (not `retCode` / `retMsg`)
- Aurora is read-only — these endpoints recommend, they don't create or modify bots. Always pair with a Trading Bot create endpoint to act on a recommendation
- The `aurora_id` is opaque and time-bounded — refetch may return a 4xx after a TTL (treat the strategy as stale and recommend again)
- Scaled fields (`_e2`, `_e4`) — see [Scaling Factor Convention](#scaling-factor-convention) before showing values to users
