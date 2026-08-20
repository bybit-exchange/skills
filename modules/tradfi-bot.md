# Module: TradFi Bot

> Bybit TradFi Combo — portfolio rebalance bot over MT5 traditional-finance assets: stocks (NVIDIA, TSLA, TSM, PLTR, AVGO…), commodities (`XAUUSD+`, `XAGUSD`, `USOUSD`), forex, indices, metals.

> **⚠️ This module requires `modules/trading-bot.md`** and documents ONLY what is TradFi-specific. Everything shared lives there and applies unchanged:
> - ⛔ Out of Scope rules (manual orders, copy trading, …)
> - Identity & Principles, including **Fill-in principle / `round_up_nice()` rounding**, "No internal process exposure", and "Never silently change user-selected or Aurora-recommended params"
> - Safety Rules (confirmation-before-write, large-amount second confirmation, anti-gambling) — **non-bypassable, evaluated first**
> - User Type Detection (Beginner vs Advanced flow shape)
> - Backtest common params, `_e4` response decoding, and shared error handling
>
> Do NOT re-derive any of the above from this file.

> **Not to be confused with `modules/tradfi.md`** — that module covers *manually* trading tokenized stocks and commodity perpetuals (`TSLAXUSDT`, `XAUUSDT`, `CLUSDT`) via the standard V5 order endpoints. This module is the *bot* over MT5 instruments (`XAUUSD+`, `USOUSD`). Different symbols, different endpoints. If the user wants to place an order themselves → `tradfi.md`. If they want an auto-rebalancing portfolio bot → this file.

---

## What It Is

Multi-asset portfolio bot that auto-rebalances to maintain target weights. Two modes:

| Mode | `grid_mode` value | Description |
|------|-------------------|-------------|
| Normal (Portfolio Rebalance) | `MT5_COMBO_GRID_MODE_UNSPECIFIED` (or omit) | Multi-asset portfolio with auto-rebalancing. Long / Short / Mixed directions supported |
| Grid-Like (displayed as "GRID" on page) | `MT5_COMBO_GRID_MODE_GRID_LIKE` | Single asset + USDT stablecoin pair. **Long only.** Requires exactly 2 symbols: one trading asset (`SIDE_LONG`) + one USDT stablecoin (`USDUSD+`, `SIDE_LONG`). Optional price range params: `adjust_position_min_price` / `adjust_position_max_price` |

**Direction:** Long / Short **per asset** — Aurora `tokens[].mode` (`GRID_MODE_LONG`/`GRID_MODE_SHORT`) → create `symbol_settings[].side` (`SIDE_LONG`/`SIDE_SHORT`).

**Sub-accounts:** Supported | **Max concurrent bots:** 50

---

## Flow

### Step 1 — Aurora recommendations

**Skip kline analysis entirely** — this is a multi-asset portfolio, not a single-symbol grid. Go straight to Aurora.

TradFi Combo has its own dedicated endpoint (NOT `/v5/aurora/explore`, NOT `/v5/aurora/creation`):

```
POST /v5/aurora/tradficombo
Body: { "long_block_id": "<category>", "short_block_id": "<category>" }
```
Returns up to 6 portfolio strategies across TradFi assets.

Categories: `Stocks` · `Commodities` · `Forex` · `Indices` · `Metals` · `recommend` (AI-picked, usable in either slot)

Strategy modes:
- **Long only:** `{"long_block_id": "Stocks", "short_block_id": ""}` — all assets go long
- **Short only:** `{"long_block_id": "", "short_block_id": "Commodities"}` — all assets go short
- **Mixed (long + short):** `{"long_block_id": "Stocks", "short_block_id": "Metals"}` — some long, some short

⚠️ Mixed mode: `long_block_id` and `short_block_id` must be **different** categories.

**When Aurora returns empty:**
1. Try a different category (6 available: Stocks / Commodities / Forex / Indices / Metals / recommend)
2. If all categories return empty → inform user: "No AI recommendation available at the moment. Please select assets and weights manually, or try again later."

⚠️ **Do NOT fall back to Bollinger Bands.** That fallback in `trading-bot.md` applies to single-symbol bots only — a multi-asset portfolio has no single price series.

⚠️ Aurora response nesting: params are under `result.data[]` (NOT top-level `data[]`).

### Step 2 — Pre-confirm: fetch symbol list + limits

Both calls are **mandatory before showing the confirmation card**.

1. `POST /v5/mt5combobot/get-symbol-list` → per-symbol `enable_trading` (`true` = market open, `false` = closed) and per-symbol max leverage
2. `POST /v5/mt5combobot/get-limit` → `init_margin.min`/`max`, `leverage.min`/`max`, `check_code`

Then:
- **Investment:** display `round_up_nice(init_margin.min)` (Fill-in rounding rules in `trading-bot.md`), showing the real minimum alongside. **Ignore Aurora `min_investment`.**
- **Leverage:** recommended = `min(all selected assets' max leverage, 50)`; displayed actual max = `min(all selected assets' max leverage, 100)`. Use Aurora's value if ≤ 50, otherwise cap at 50.
  Example: assets support [50x, 80x, 100x] → max 50x, recommended 50x. Assets support [200x, 150x] → max 100x, recommended 50x.
- **Market status:** show ✓ Open / Closed per asset. If ANY market is closed, add: "Bot will enter AWAIT_ACTIVATION and auto-start when all markets open".

### Step 3 — Confirmation card, wait for confirm

```
TradFi Combo (Aurora AI · Long)

Assets:
  XAUUSD+  Long 34%  [Market Open ✓]
  XAGUSD   Long 33%  [Market Open ✓]
  USOUSD   Long 33%  [Market Closed – will activate when market opens]

Leverage: 20x (recommended, max 50x)
Rebalance: By threshold 3%
Investment: 4,500 USDT (minimum 4,064)
Trailing Stop: disabled

Risk disclosure: TradFi assets have limited trading hours. Bot will only open/close positions when markets are open.

Reply "confirm" to launch, "backtest" to check historical performance, or tell me what to adjust.
```

> **Localization:** adapt to the user's language; keep `confirm` as-is (system keyword), localize "backtest" → 「回测」.

### Step 4 — Validate (after user confirms, before creating)

| Endpoint | Success check |
|----------|---------------|
| `POST /v5/mt5combobot/get-limit` (pass full create body with `init_margin` from Step 2) | `retCode=0` + `check_code="LIMIT_CHECK_CODE_SUCCESS_UNSPECIFIED"` |

`check_code` handling:

| check_code | Action |
|-----------|--------|
| `LIMIT_CHECK_CODE_SUCCESS_UNSPECIFIED` | Validation passed |
| `LIMIT_CHECK_CODE_INIT_MARGIN_TOO_LOW` | Re-read `init_margin.min` and use `min × 1.02` (price moved since Step 2) |
| `LIMIT_CHECK_CODE_INIT_MARGIN_TOO_HIGH` | Reduce investment to at most `init_margin.max` |
| `LIMIT_CHECK_CODE_LEVERAGE_TOO_HIGH` | Reduce leverage to at most `leverage.max` |
| `retCode=10001` | Params error — most often `target_position_percent` not summing to `"1.0"` |

### Step 5 — Balance check & transfer

Quote token is **always USDT** for TradFi Combo. Otherwise follow `trading-bot.md` Step 4 unchanged — including: **do not auto-transfer without asking**; present the shortfall and wait for `confirm`.

### Step 6 — Create, then verify initialization

`POST /v5/mt5combobot/create` → success = `retCode=0` + non-zero `bot_id`.

**Initialization takes ~30 seconds** (longer than crypto bots). Then check `get-detail`:

| `bot_display_status` | Meaning | Action |
|----------------------|---------|--------|
| `BOT_DISPLAY_STATUS_RUNNING` | ✅ All markets open, positions opened | Report success |
| `BOT_DISPLAY_STATUS_AWAIT_ACTIVATION` | ✅ Created, waiting for markets | Report success **with note**: bot will auto-activate when all selected markets open. **This is normal, not an error.** |
| `BOT_DISPLAY_STATUS_COMPLETED` + `close_code` set | ❌ Initialization failed | Report failure + reason |

⚠️ `close_code = MT5_COMBO_BOT_CLOSE_CODE_FAILED_INITIATION` is the **default/unset value** — not an error. **Judge bot state by `bot_display_status`, never by `close_code`.**

---

## Backtest

Triggered by the user saying "backtest" / 「回测」. Common params, `_e4` decoding, cooldown, and shared error codes are in `trading-bot.md` — only the TradFi-specific bits are here.

| Endpoint | Key params |
|----------|-----------|
| `POST /v5/backtest/tradfi-combo` | `contracts[]`, `leverage`, `rebalance_threshold`, `rebalance_interval` |

- **Fallback defaults** (Aurora unavailable / user gave only assets): `leverage = 5`, `rebalance_threshold = "5"`, `rebalance_interval = "7d"`, weights = equal split
- **Param mapping** from Aurora / create params: same as Futures Combo — `contracts[].symbol`, `contracts[].direction` (`GRID_MODE_LONG`→`LONG`), `contracts[].weight` = `ratio_e2` (already an integer %), `leverage`, `rebalance_threshold` = `resize_ratio_e2` as string, `rebalance_interval` = seconds → duration string
- **`rebalance_interval` format:** `<number>[m|h|d]` — from seconds: 1800→`"30m"`, 3600→`"1h"`, 14400→`"4h"`, 28800→`"8h"`, 43200→`"12h"`, 86400→`"1d"`, 259200→`"3d"`, 604800→`"7d"`, 1209600→`"14d"`, 2419200→`"28d"`
- `return_volatility_e4` is the volatility field for combo/tradfi (grid/martingale use `atr_e4` instead)

---

## Query Status

**In `list-all-bots`:** type filter `BOT_TYPE_ENUM_COMBO_MT5`; response object key `mt5_combo`; status at `mt5_combo.bot_display_status`; P&L at `mt5_combo.total_pnl` / `mt5_combo.total_pnl_per`.

**Detail:**

| Purpose | Endpoint | Body |
|---------|----------|------|
| Bot detail | `POST /v5/mt5combobot/get-detail` | `{ "bot_id": <id> }` |
| Positions | `POST /v5/mt5combobot/get-positions` | `{ "bot_id": <id> }` |

**`get-detail` response** (`result.detail`) — most fields self-descriptive (`total_pnl` USD, `equity`, `total_margin` = initial investment, `leverage`, `trailing_stop_percent`, `run_time_duration` in seconds, `symbol_settings[]` with per-asset `enable_trading`). Non-obvious:

| Field | Note |
|-------|------|
| `bot_display_status` | **Judge bot state by this**: `..._RUNNING` / `..._AWAIT_ACTIVATION` / `..._COMPLETED` |
| `total_pnl_per` | **Decimal**, not a percentage: `-0.0312` = -3.12% |
| `total_apr` | Already a percentage: `-11.388` = -11.388% |
| `bot_mode` | `BOT_MODE_LONG` / `_SHORT` / `_MIX` |
| `adjusted_position_num` | Number of rebalances executed |
| `close_code` | Default `MT5_COMBO_BOT_CLOSE_CODE_FAILED_INITIATION` is **unset, not an error** — ignore |

**`get-positions` response** (`result.positions[]`): fields are self-descriptive (`symbol`, `side`, `pos_size`, `pos_value` USD, `avg_entry_price`, `current_price`, `leverage`). Non-obvious: `current_position_percent` / `target_position_percent` are **decimals** (`0.34` = 34%).

Output format when showing positions:
```
TradFi Combo Positions | BOT-XXXXXX

Symbol       Side   Target  Actual  Value      Entry     Current
XAUUSD+      Long   34%     34.7%   $4,414     $4,414    $4,414
USOUSD       Long   33%     39.1%   $5,009     $83.49    $82.78
XAGUSD       Long   33%     26.2%   $3,329     $66.58    $66.44
```

---

## Stop Bot

Confirmation is **mandatory** — follow the Stop Bot rules in `trading-bot.md` (tell the user to reply `confirm` upfront, then wait).

```
POST /v5/mt5combobot/close  Body: { "bot_id": <id> }
```

⚠️ If any selected asset's market is currently closed, the bot enters `CLOSING` and waits until all positions can be settled — each asset settles only when its own market reopens. Inform the user: "Bot is closing. Some markets are currently closed; positions will be fully settled when all markets reopen."

**Termination:** positions closed at market price while markets are open; otherwise `CLOSING` until they reopen.

---

## Modify Parameters

**Nothing is modifiable via API** — all params are fixed at creation.

For modify settings / adjust position / transfer funds in-out, direct the user to the Bybit web/app Trading Bot page:

> "TradFi Combo modification and fund operations are available on the Bybit Trading Bot page. Want me to show you your bot's current status instead?"

---

## Bot Parameter Constraints

**Portfolio rules:**
- Minimum 2, maximum 10 assets
- Each asset weight to 1% precision; total must equal 100% (`target_position_percent` must sum to exactly `"1.0"`)
- Available assets fetched via `POST /v5/mt5combobot/get-symbol-list`

**Leverage:** actual max = `min(all selected assets' max leverage, 100)`; recommended = `min(all selected assets' max leverage, 50)`. Manual mode range **1x–100x**, capped by the selected assets.

**Auto Rebalance:** three modes with strict field-exclusion rules (passing extra fields → `retCode=10001`):

| Mode | `adjust_position_percent` | `adjust_position_time_interval` | Note |
|------|---------------------------|--------------------------------|------|
| `ADJUST_POSITION_MODE_PERCENT` | **required** (1%–50%, integer only) | **do NOT pass** | Threshold only |
| `ADJUST_POSITION_MODE_TIME` | **do NOT pass** | **required** (presets: 1800/3600/14400/28800/43200/86400/259200/604800/1209600/2419200) | Time only |
| `ADJUST_POSITION_MODE_TIME_OR_PERCENT` | **required** | **required** | Whichever triggers first |

**Selecting the mode from Aurora** (determines which fields go into create):
- `resize_ratio_e2 > 0` AND `resize_time > 0` → `TIME_OR_PERCENT` — pass both
- `resize_ratio_e2 > 0` AND `resize_time == 0` → `PERCENT` — pass `adjust_position_percent` only, **omit** `adjust_position_time_interval`
- `resize_ratio_e2 == 0` AND `resize_time > 0` → `TIME` — pass `adjust_position_time_interval` only, **omit** `adjust_position_percent`

**Trailing Stop:**
- Range 5%–99% (`"0.05"`–`"0.99"`); `"0"` = disabled
- Value is the drawdown threshold from peak equity — `"0.10"` triggers when equity drops 10% from peak

**TP / SL:** **not supported.** Do not include `sl_percent` / `tp_percent` in create params.

**Trading hours (the critical difference from crypto bots):**
- Each asset may have a different schedule; `get-symbol-list` reports `enable_trading` per symbol
- **Creating while a market is closed is allowed** → bot enters `AWAIT_ACTIVATION`, auto-activates when all selected markets open
- **Closing while a market is closed** → bot enters `CLOSING`; full settlement may take until all markets reopen
- **Weekend:** most stock markets closed Sat–Sun; commodities may have partial hours. Always check `enable_trading`

**Investment amount:** call `get-limit` → display `round_up_nice(init_margin.min)` (show the minimum alongside). At creation time: if the user gave an explicit amount ≥ `init_margin.min`, pass it **as-is** (never silently change a user-chosen amount); only when falling back to the minimum, pass `init_margin.min × 1.02` (internal price-fluctuation buffer). **Ignore Aurora `min_investment`.**

**Fund rules:** same as Futures Combo — profits stay in the bot as additional margin. Transfer in/out via web/app only.

**Creation Mode:** AI Strategy shows recommendations filtered by category (`long_block_id`/`short_block_id`). Manual mode allows choosing assets, weights, leverage, and mode (Normal vs Grid-Like) freely.

**Grid-Like mode create example:**
```json
{
  "symbol_settings": [
    {"symbol": "TSLA", "side": "SIDE_LONG", "target_position_percent": "0.5"},
    {"symbol": "USDUSD+", "side": "SIDE_LONG", "target_position_percent": "0.5"}
  ],
  "leverage": "50",
  "adjust_position_mode": "ADJUST_POSITION_MODE_PERCENT",
  "adjust_position_percent": "0.03",
  "adjust_position_min_price": "",
  "adjust_position_max_price": "",
  "init_margin": "100",
  "trailing_stop_percent": "0",
  "grid_mode": "MT5_COMBO_GRID_MODE_GRID_LIKE"
}
```

---

## API Reference

```
POST /v5/aurora/tradficombo
Body: { "long_block_id": "<category>", "short_block_id": "<category>" }
# Categories: Stocks | Commodities | Forex | Indices | Metals | recommend
# "" = unused slot. Mixed mode requires the two ids to differ.

POST /v5/mt5combobot/get-symbol-list  Body: {}
# Returns available TradFi assets with enable_trading (true=market open) and per-symbol max leverage

POST /v5/mt5combobot/get-limit
Body: {
  "init_margin": "",
  "leverage": "50",
  "symbol_settings": [
    {"symbol": "XAUUSD+", "side": "SIDE_LONG", "target_position_percent": "0.50"},
    {"symbol": "USOUSD",  "side": "SIDE_LONG", "target_position_percent": "0.50"}
  ],
  "adjust_position_mode": "ADJUST_POSITION_MODE_PERCENT",
  "adjust_position_percent": "0.03",
  "trailing_stop_percent": "0"
}
// ⚠️ PERCENT mode → do NOT include adjust_position_time_interval (omit entirely, not null)
# Returns: init_margin.min/max, leverage.min/max, check_code
# ⚠️ target_position_percent across all symbols MUST sum to exactly "1.0"

POST /v5/mt5combobot/create
Body: {
  "symbol_settings": [
    {"symbol": "XAUUSD+", "side": "SIDE_LONG", "target_position_percent": "0.34"},
    {"symbol": "XAGUSD",  "side": "SIDE_LONG", "target_position_percent": "0.33"},
    {"symbol": "USOUSD",  "side": "SIDE_LONG", "target_position_percent": "0.33"}
  ],
  "leverage": "20",                       // string, min(all assets' max leverage, 100)
  "adjust_position_mode": "ADJUST_POSITION_MODE_TIME_OR_PERCENT",
  "adjust_position_percent": "0.03",      // integer % as decimal string: 3% → "0.03". ONLY for PERCENT / TIME_OR_PERCENT
  "adjust_position_time_interval": 3600,  // integer seconds. ONLY for TIME / TIME_OR_PERCENT
  // ⚠️ Field exclusion by mode → see "Auto Rebalance" table above. Passing extra → 10001
  "init_margin": "300",                   // total investment in USD
  "trailing_stop_percent": "0.99"         // "0" = disabled; range 0.05-0.99
}
// NOTE: sl_percent / tp_percent are NOT supported — do not include

POST /v5/mt5combobot/close          Body: { "bot_id": <id> }
POST /v5/mt5combobot/get-detail     Body: { "bot_id": <id> }
POST /v5/mt5combobot/get-positions  Body: { "bot_id": <id> }
```

**Aurora → create field mapping:** Aurora uses the same `fcomboBot` key and snake_case fields as Futures Combo.

| Aurora field (`fcomboBot.`) | Create param | Conversion |
|-----------------------------|--------------|------------|
| `tokens[].ratio_e2` | `target_position_percent` | `÷ 100` → `ratio_e2=10` → `"0.10"` |
| `tokens[].mode` | `side` | `"GRID_MODE_LONG"` → `"SIDE_LONG"` · `"GRID_MODE_SHORT"` → `"SIDE_SHORT"` |
| `tokens[].symbol` | `symbol` | pass directly |
| `leverage` | `leverage` | pass as string |
| `resize_ratio_e2` | `adjust_position_percent` | `÷ 100` → `3` → `"0.03"`; `0` = threshold disabled, use time-only mode |
| `resize_time` | `adjust_position_time_interval` | pass as seconds directly (e.g. `28800` = 8h); `0` = time disabled, use threshold-only mode |
| `min_investment` (top-level) | — | **Ignore.** Use `get-limit` `init_margin.min` (see Investment amount rule) |

## Enums

* **`grid_mode`**: `MT5_COMBO_GRID_MODE_UNSPECIFIED` (Normal, or omit) | `MT5_COMBO_GRID_MODE_GRID_LIKE`
* **`side`**: `SIDE_LONG` | `SIDE_SHORT`
* **`adjust_position_mode`**: `ADJUST_POSITION_MODE_PERCENT` | `ADJUST_POSITION_MODE_TIME` | `ADJUST_POSITION_MODE_TIME_OR_PERCENT`
* **`bot_display_status`**: `BOT_DISPLAY_STATUS_RUNNING` | `BOT_DISPLAY_STATUS_AWAIT_ACTIVATION` | `BOT_DISPLAY_STATUS_COMPLETED`
* **`bot_mode`**: `BOT_MODE_LONG` | `BOT_MODE_SHORT` | `BOT_MODE_MIX`
* **bot type (list-all-bots filter)**: `BOT_TYPE_ENUM_COMBO_MT5`
