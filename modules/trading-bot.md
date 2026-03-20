# Module: Trading Bot

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Trading Bot

User might say: "Create a grid bot for BTC", "Set up DCA for BTC and ETH", "Close my grid bot", "Check my grid bot status"

---

## Response Format

Trading Bot endpoints use a **different response format** from standard V5 endpoints:

```json
{"status_code": 200, "debug_msg": "", "result": {...}}
```

> **Note**: Uses `status_code`/`debug_msg` (not `retCode`/`retMsg`). `status_code=200` means success. `status_code=421` means user is banned (check `ban_reason_text`).

---

## Spot Grid Bot

### Validate Input

Validate parameters before creation. Returns acceptable ranges and a check code.

```
POST /v5/grid/validate-input
```

> Rate limit: 100 qps per IP. **Note**: Despite the OpenAPI spec claiming guest mode, testnet requires authentication. Always send auth headers to be safe.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Y | e.g. `BTCUSDT` |
| cell_number | integer | Y | Number of grid intervals. Min: 2 |
| min_price | string | Y | Lower bound of grid price range |
| max_price | string | Y | Upper bound of grid price range |
| total_investment | string | Y | Investment amount in quote token |
| stop_loss | string | N | Stop-loss price |
| take_profit | string | N | Take-profit price |
| entry_price | string | N | Entry trigger price |
| invest_mode | integer | N | `0` quote only (default), `1` base only, `2` both |
| base_investment | string | N | Investment in base token. Used when invest_mode is 1 or 2 |
| quote_investment | string | N | Investment in quote token. Used when invest_mode is 0 or 2 |
| enable_trailing | boolean | N | Enable grid trailing (auto-shift). Requires cell_number >= 5 |
| ts_percent | string | N | Trailing stop callback ratio, range [0, 0.99] (e.g. `0.05` = 5%) |
| limit_up_price | string | N | Upper limit price for grid trailing |

**Response**: Returns `check_code` + acceptable ranges for every parameter.
- `check_code = "SPOT_CHECK_CODE_SUCCESS_UNSPECIFIED"` means all params are valid.
- Other codes pinpoint the exact issue (e.g. `SPOT_CHECK_CODE_INVESTMENT_TOO_LOW`).

> **Workflow**: Always call `validate-input` before `create-grid`.

### Create Bot

```
POST /v5/grid/create-grid
```

Rate limit: 3 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Y | e.g. `BTCUSDT` |
| max_price | string | Y | Upper bound of grid price range |
| min_price | string | Y | Lower bound of grid price range |
| total_investment | string | Y | Investment amount in quote token |
| cell_number | integer | Y | Number of grid intervals. Min: 2 |
| entry_price | string | N | Entry trigger price |
| stop_loss_price | string | N | Stop-loss trigger price |
| take_profit_price | string | N | Take-profit trigger price |
| invest_mode | integer | N | `0` quote only (default), `1` base only, `2` both |
| base_investment | string | N | Investment in base token (when invest_mode includes base) |
| quote_investment | string | N | Investment in quote token (when invest_mode includes quote) |
| enable_trailing | boolean | N | Enable grid trailing. Requires cell_number >= 5 |
| ts_percent | string | N | Trailing stop callback ratio [0, 0.99] |
| limit_up_price | string | N | Upper limit price for grid trailing |
| followed_grid_id | integer | N | Grid ID to copy. `0` if not following |

**Response**: Returns `grid_id` on success. Store it for query/close calls.

### Close Bot

```
POST /v5/grid/close-grid
```

Rate limit: 3 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| grid_id | integer | Y | Grid bot ID to close |
| close_mode | integer | Y | Settlement mode: `1` BIT, `2` convert to base token, `3` convert to quote token, `4` return as-is (no conversion) |

> Bot must be in `NEW` or `RUNNING` state. Bots in `CANCELLING` or `COMPLETED` cannot be closed again.

### Get Detail

```
POST /v5/grid/query-grid-detail
```

Rate limit: 10 qps per UID. **Note: This is POST, not GET** — pass `grid_id` in request body.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| grid_id | integer | Y | Grid bot ID |

**Response** includes: symbol, price range, investment, profit metrics (total_profit, grid_profit, total_apr), arbitrage_num, status, TP/SL settings, trailing config, close_reason.

### Grid Status

`RAW` -> `NEW` -> `INITIALIZING` -> `RUNNING` -> `CANCELLING` -> `COMPLETED`. Also: `REJECTED`.

### Close Reason Codes

| Code | Reason |
|------|--------|
| CLOSED_MANUALLY | User manually closed |
| CLOSED_STOP_LOSS | Stop-loss triggered |
| CLOSED_TAKE_PROFIT | Take-profit triggered |
| CLOSED_TRAILING_STOP | Trailing stop triggered |
| CLOSED_SYMBOL_DELISTED | Symbol delisted |
| CLOSED_FAILED_INITIATION | Failed to initialize |
| CLOSED_USER_BAN | User banned |

---

## Futures Grid Bot

### Validate Input

```
POST /v5/fgridbot/validate
```

Rate limit: 10 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Y | e.g. `BTCUSDT` |
| cell_number | integer | Y | Number of grid intervals |
| min_price | string | Y | Lower bound of grid price range |
| max_price | string | Y | Upper bound of grid price range |
| leverage | string | Y | Leverage multiplier (decimal string) |
| grid_type | integer | Y | `1` arithmetic, `2` geometric |
| grid_mode | integer | Y | `1` neutral, `2` long, `3` short |
| stop_loss_price | string | N | Stop-loss price |
| take_profit_price | string | N | Take-profit price |
| stop_loss_per | string | N | Stop-loss as percentage |
| take_profit_per | string | N | Take-profit as percentage |
| tp_sl_type | integer | N | `1` both %, `2` both price, `3` TP price + SL %, `4` TP % + SL price |
| entry_price | string | N | Entry trigger price |
| trailing_stop_per | string | N | Trailing stop percentage |
| init_margin | string | N | Initial margin |
| move_up_price | string | N | Grid shift upper limit |
| move_down_price | string | N | Grid shift lower limit |

**Response**: Returns ranges and `check_code`. `FGRID_CHECK_CODE_SUCCESS` means OK.

### Create Bot

```
POST /v5/fgridbot/create
```

Rate limit: 10 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Y | e.g. `BTCUSDT` |
| grid_mode | integer | Y | `1` neutral, `2` long, `3` short |
| min_price | string | Y | Lower bound of grid price range |
| max_price | string | Y | Upper bound of grid price range |
| cell_number | integer | Y | Number of grid intervals |
| leverage | string | Y | Leverage multiplier |
| grid_type | integer | Y | `1` arithmetic, `2` geometric |
| total_investment | string | Y | Total investment amount |
| entry_price | string | N | Entry trigger price |
| stop_loss_price | string | N | Stop-loss price |
| take_profit_price | string | N | Take-profit price |
| stop_loss_per | string | N | Stop-loss as percentage |
| take_profit_per | string | N | Take-profit as percentage |
| tp_sl_type | integer | N | `1` both %, `2` both price, `3` TP price + SL %, `4` TP % + SL price |
| trailing_stop_per | string | N | Trailing stop percentage |
| move_up_price | string | N | Grid shift upper limit |
| move_down_price | string | N | Grid shift lower limit |

**Response**: Returns `bot_id` on success.

### Close Bot

```
POST /v5/fgridbot/close
```

Rate limit: 10 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bot_id | integer | Y | Bot ID to close |
| stop_type | integer | N | Close reason code (e.g. `2` = user stopped) |

### Get Detail

```
POST /v5/fgridbot/detail
```

Rate limit: 10 qps per UID. **Note: This is POST, not GET.**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bot_id | integer | Y | Bot ID |

**Response** includes: symbol, price range, grid config, leverage, PnL metrics (realized, unrealized, total), arbitrage count, APR, funding fees, liquidation price, status, stop reason.

### Futures Grid Status Codes

| Code | Status |
|------|--------|
| 0 | Unspecified |
| 1 | Rejected |
| 2 | New |
| 3 | Initializing |
| 4 | Running |
| 5 | Cancelling |
| 6 | Completed |
| 7 | Await activation |

---

## Futures Martingale Bot

### Get Limits

Validate parameters and get acceptable ranges before creation.

```
POST /v5/fmartingalebot/getlimit
```

Rate limit: 100 qps per IP. **Note: This is POST, not GET.**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Y | e.g. `BTCUSDT` |
| martingale_mode | integer | Y | `1` long (buys dip), `2` short (sells rally) |
| leverage | string | Y | Leverage multiplier |
| price_float_percent | string | N | Price drop/rise % to trigger add-position |
| add_position_percent | string | N | Position increase ratio per add |
| add_position_num | integer | N | Max number of add-position orders |
| init_margin | string | N | Initial margin amount |
| round_tp_percent | string | N | Round take-profit percentage |
| sl_percent | string | N | Stop-loss percentage |
| entry_price | string | N | Entry trigger price |

**Response**: Returns ranges and `check_code` for all parameters.

### Create Bot

```
POST /v5/fmartingalebot/create
```

Rate limit: 10 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Y | e.g. `BTCUSDT` |
| martingale_mode | integer | Y | `1` long (buys dip), `2` short (sells rally) |
| leverage | string | Y | Leverage multiplier |
| price_float_percent | string | Y | Price drop/rise % to trigger add-position |
| add_position_percent | string | Y | Position increase ratio per add |
| add_position_num | integer | Y | Max number of add-position orders |
| init_margin | string | Y | Initial margin amount |
| round_tp_percent | string | Y | Round take-profit percentage |
| auto_cycle_toggle | integer | N | `1` enabled, `2` disabled. Auto-restart after TP |
| sl_percent | string | N | Stop-loss percentage |
| entry_price | string | N | Entry trigger price |

**Response**: Returns `bot_id` on success.

### Close Bot

```
POST /v5/fmartingalebot/close
```

Rate limit: 10 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bot_id | integer | Y | Bot ID to close |
| stop_type | integer | N | Close reason code (e.g. `2` = user stopped) |

### Get Detail

```
POST /v5/fmartingalebot/detail
```

Rate limit: 10 qps per UID. **Note: This is POST, not GET.**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bot_id | integer | Y | Bot ID |

**Response** includes: symbol, mode, leverage, config params, PnL (realized/unrealized/total), position info, round progress, margin balances, timestamps.

---

## Spot DCA Bot

### Create Bot

```
POST /v5/dca/create-bot
```

Rate limit: 3 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| parameters | object | Y | See nested fields below |
| parameters.frequency_in_second | integer | Y | Purchase interval in seconds. Min: 10. Common: 600 (10min), 3600 (1h), 86400 (1d) |
| parameters.quote_coin | string | Y | Quote currency, e.g. `USDT` |
| parameters.pairs | array | Y | Array of `{base, amount}` objects. Max 5 pairs per bot |
| max_invest_amount | string | N | Maximum total investment amount |

```json
{"parameters":{"frequency_in_second":3600,"quote_coin":"USDT","pairs":[{"base":"BTC","amount":"10"},{"base":"ETH","amount":"10"}]}}
```

**Response**: Returns `bot_id` on success.

### Close Bot

```
POST /v5/dca/close-bot
```

Rate limit: 3 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bot_id | integer | Y | Bot ID to close |
| close_mode | integer | Y | Settlement mode: `1` BIT, `2` convert to base tokens, `3` convert to quote token |

> `status_code=503` means bot is in the middle of an investment cycle — retry later.

---

## Futures Combo Bot

Multi-symbol portfolio bot with auto-rebalancing.

### Get Limits

Validate parameters and get acceptable ranges before creation.

```
POST /v5/fcombobot/getlimit
```

Rate limit: 10 qps per UID. **Note: This is POST, not GET.**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| leverage | string | Y | Leverage multiplier |
| init_margin | string | Y | Initial margin amount |
| adjust_position_mode | integer | Y | Rebalance trigger: `1` time, `2` percent, `3` both (whichever first), `4` manual, `5` on modification, `6` on transfer |
| symbol_settings | array | Y | Array of `{symbol, target_position_percent, side}` |
| adjust_position_percent | string | N | Deviation % to trigger rebalance (when mode includes percent) |
| adjust_position_time_interval | integer | N | Rebalance interval in seconds (when mode includes time) |
| sl_percent | string | N | Stop-loss percentage |
| tp_percent | string | N | Take-profit percentage |
| trailing_stop_percent | string | N | Trailing stop percentage |

**Response**: Returns ranges and `check_code` for all parameters.

### Create Bot

```
POST /v5/fcombobot/create
```

Rate limit: 10 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| leverage | string | Y | Leverage multiplier |
| init_margin | string | Y | Initial margin amount |
| adjust_position_mode | integer | Y | `1` time, `2` percent, `3` both, `4` manual, `5` on modification, `6` on transfer |
| symbol_settings | array | Y | Array of `{symbol, target_position_percent, side}` objects |
| adjust_position_percent | string | N | Deviation % to trigger rebalance |
| adjust_position_time_interval | integer | N | Rebalance interval in seconds |
| sl_percent | string | N | Stop-loss percentage |
| tp_percent | string | N | Take-profit percentage |
| trailing_stop_percent | string | N | Trailing stop percentage |

**Response**: Returns `bot_id` on success.

### Close Bot

```
POST /v5/fcombobot/close
```

Rate limit: 10 qps per UID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bot_id | integer | Y | Bot ID to close |
| stop_type | integer | N | Close reason code (e.g. `2` = user stopped) |

### Get Detail

```
POST /v5/fcombobot/detail
```

Rate limit: 10 qps per UID. **Note: This is POST, not GET.**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bot_id | integer | Y | Bot ID |

**Response** includes: config, multi-symbol positions, PnL metrics (realized/unrealized/total), rebalancing stats, margin/equity balances.

---

## Error Codes

Trading Bot endpoints use numeric error codes in the 70000-89999 range:

### Martingale Bot (70xxx)

| Code | Error |
|------|-------|
| 70001 | Margin result not found |
| 70002 | Bot already stopped |
| 70003 | Active bot already exists for this symbol |
| 70004 | Bot not found |
| 70005 | Create failed |
| 70009 | Investment too low |
| 70010 | Investment too high |
| 70011 | Leverage too low |
| 70012 | Leverage too high |
| 70025 | Position already exists (close before creating) |
| 70026 | Open orders exist (cancel before creating) |
| 70028 | Account must be UTA type |

### Futures Grid / Combo Bot (80xxx)

| Code | Error |
|------|-------|
| 80002 | Bot already stopped |
| 80003 | Active bot already exists |
| 80004 | Bot not found |
| 80005 | Create failed |
| 80007 | Position already exists |
| 80008 | Open orders exist |
| 80010 | Account must be UTA type |
| 80100 | Investment too low |
| 80101 | Investment too high |
| 80102 | Leverage too low |
| 80103 | Leverage too high |

---

## Notes

- All bot creation/close endpoints are POST and require authentication
- All "Get Detail" endpoints are **POST** (not GET) — pass the bot ID in the request body
- Always validate parameters before creating a bot (spot grid: `validate-input`, futures grid: `fgridbot/validate`, martingale: `fmartingalebot/getlimit`, combo: `fcombobot/getlimit`)
- Bot IDs (`grid_id`, `bot_id`) are returned from create responses — store them for subsequent detail/close calls
- Spot Grid and DCA close endpoints require `close_mode` to specify how remaining assets are settled
- Account must be UTA (Unified Trading Account) type to use futures bots (error 70028/80010)
