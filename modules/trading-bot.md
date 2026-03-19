# Module: Trading Bot

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Trading Bot

User might say: "Create a grid bot for BTC", "Set up DCA for BTC and ETH", "Close my grid bot", "Check my grid bot status"

---

### Spot Grid Bot

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Validate Input | `/v5/grid/validate-input` | POST | symbol, cell_number, min_price, max_price, total_investment | stop_loss, take_profit, entry_price, invest_mode, enable_trailing, ts_percent, limit_up_price |
| Create Bot | `/v5/grid/create-grid` | POST | symbol, max_price, min_price, total_investment, cell_number | entry_price, stop_loss, take_profit, trailing_stop, invest_mode, enable_trailing, ts_percent, limit_up_price |
| Close Bot | `/v5/grid/close-grid` | POST | grid_id | — |
| Get Detail | `/v5/grid/query-grid-detail` | POST | grid_id | — |

> `invest_mode`: `0` (quote only) `1` (base only) `2` (both). `enable_trailing`: grid trailing (auto-shift), requires `cell_number` >= 5. Validate is unauthenticated (100 qps/IP). Get Detail is POST (not GET). Rate limit: create 3 qps, detail 10 qps.

> **Workflow**: Always call `validate-input` before `create-grid`. A `check_code` of `SPOT_CHECK_CODE_SUCCESS_UNSPECIFIED` means all params are valid. The response also includes acceptable ranges for every parameter.

> **Grid status**: `RAW` → `NEW` → `INITIALIZING` → `RUNNING` → `CANCELLING` → `COMPLETED`. Also: `REJECTED`.

### Futures Grid Bot

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Validate Input | `/v5/fgridbot/validate` | POST | symbol, min_price, max_price, cell_number, leverage, grid_type | — |
| Create Bot | `/v5/fgridbot/create` | POST | symbol, grid_mode, min_price, max_price, cell_number, leverage, grid_type, total_investment | entry_price, stop_loss, take_profit, trailing_stop |
| Close Bot | `/v5/fgridbot/close` | POST | bot_id | — |
| Get Detail | `/v5/fgridbot/detail` | GET | bot_id | — |

> `grid_mode`: `2` (arithmetic). `grid_type`: `1` (long) `2` (short) `3` (neutral). Rate limit: 10 qps.

### Futures Martingale Bot

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Get Limits | `/v5/fmartingalebot/getlimit` | GET | symbol | — |
| Create Bot | `/v5/fmartingalebot/create` | POST | symbol, martingale_mode, leverage, price_float_percent, add_position_percent, add_position_num | init_margin, round_take_profit_percent, stop_loss, auto_cycle_toggle |
| Close Bot | `/v5/fmartingalebot/close` | POST | bot_id | — |
| Get Detail | `/v5/fmartingalebot/detail` | GET | bot_id | — |

> `martingale_mode`: `1` (long — buys dip) `2` (short — sells rally). Rate limit: 10 qps.

### Spot DCA Bot

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Create Bot | `/v5/dca/create-bot` | POST | parameters (frequency_in_second, quote_coin, pairs[]) | max_investment |
| Close Bot | `/v5/dca/close-bot` | POST | bot_id | — |

> `frequency_in_second`: 600 (10min), 3600 (1h), 86400 (1d). Max 5 pairs per bot. Rate limit: 3 qps.

### Futures Combo Bot

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Get Limits | `/v5/fcombobot/getlimit` | GET | — | — |
| Create Bot | `/v5/fcombobot/create` | POST | leverage, init_margin, symbol_settings[], adjust_position_mode | adjust_position_percent, adjust_position_time_interval |
| Close Bot | `/v5/fcombobot/close` | POST | bot_id | — |
| Get Detail | `/v5/fcombobot/detail` | GET | bot_id | — |

> `adjust_position_mode`: `1` (time) `2` (percent) `3` (both). Multi-symbol portfolio with auto-rebalancing. Rate limit: 10 qps.

---

## Notes

- All bot creation/close endpoints are POST and require authentication
- Always validate parameters before creating a bot (spot grid has dedicated validate endpoint; futures grid has validate endpoint; others use getlimit)
- Bot IDs (`grid_id`, `bot_id`) are returned from create responses — store them for subsequent detail/close calls
- Spot Grid `query-grid-detail` is POST (not GET) — pass `grid_id` in request body
