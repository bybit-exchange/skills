# Module: Strategy Orders

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Strategy Orders

User might say: "Split my BTC buy into smaller orders over 10 minutes", "Place an iceberg order", "Chase the best price", "Stop my strategy", "Pause my strategy", "Resume my strategy"

---

## Category Values

Strategy endpoints use a **different category format** from standard trading endpoints:

| Category | Description |
|----------|-------------|
| `UTA_USDT` | USDT perpetual (standard endpoints call this `linear`) |
| `UTA_USDC` | USDC perpetual |
| `UTA_USDC_FUTURE` | USDC futures |
| `UTA_USDT_FUTURE` | USDT futures |
| `UTA_SPOT` | Spot trading |
| `UTA_INVERSE` | Inverse perpetual |
| `UTA_INVERSE_FUTURE` | Inverse futures |

> ⚠️ **IMPORTANT**: Strategy API **ONLY** accepts `UTA_*` category values. Do NOT use `linear` or `spot` — they will be rejected. Map: `linear` → `UTA_USDT`, `spot` → `UTA_SPOT`, `inverse` → `UTA_INVERSE`.

---

## Create Strategy

All strategy types share `POST /v5/strategy/create` with different `strategyType` values.

### TWAP (Time-Weighted Average Price)

Split order evenly over time to reduce market impact.

**Required**: category, symbol, side, size, strategyType(`twap`), duration

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Y | `UTA_USDT`, `UTA_SPOT`, etc. |
| symbol | string | Y | e.g. `BTCUSDT` |
| side | string | Y | `Buy` or `Sell` |
| size | string | Y | Total quantity in base currency |
| strategyType | string | Y | `twap` |
| duration | integer | Y | Total time in seconds. Range: [300, 86400] |
| interval | integer | N | Seconds between orders. Default: 30, min: 5. duration must be divisible by interval |
| isRandom | boolean | N | Randomize timing to avoid detection. Default: false |
| triggerPrice | string | N | Start only when price reaches this level |
| maxChasePrice | string | N | Price protection limit |
| chaseDistance | string | N | Absolute offset from best bid/ask for limit orders |
| chasePercentE4 | integer | N | Percentage offset in basis points (100 = 1%). Mutually exclusive with chaseDistance |
| reduceOnly | boolean | N | Only reduce position. Default: false |
| positionIdx | integer | N | 0=one-way, 1=hedge-long, 2=hedge-short. Default: 0 |
| leverageType | integer | N | 0=normal, 1=spot margin. Only for UTA_SPOT |

```
POST /v5/strategy/create
{"category":"UTA_USDT","symbol":"BTCUSDT","side":"Buy","size":"1","strategyType":"twap","duration":300,"isRandom":true}
```

### Iceberg

Hide large order by showing one child at a time to prevent front-running.

**Required**: category, symbol, side, size, strategyType(`iceberg`), plus ONE of subSize or orderCount

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Y | `UTA_USDT`, `UTA_SPOT`, etc. |
| symbol | string | Y | e.g. `BTCUSDT` |
| side | string | Y | `Buy` or `Sell` |
| size | string | Y | Total quantity in base currency |
| strategyType | string | Y | `iceberg` |
| subSize | string | One of | Size of each child order. Recommended: 5%-20% of total |
| orderCount | integer | One of | Number of child orders (min: 2). If both given, subSize takes precedence |
| limitPrice | string | N | Fixed price for all child orders. Mutually exclusive with chase params |
| chaseDistance | string | N | Absolute offset from best bid/ask. Special: `"-1"` = hit best price (taker) |
| chasePercentE4 | integer | N | Percentage offset in basis points (100 = 1%). Mutually exclusive with chaseDistance and limitPrice |
| maxChasePrice | string | N | Price protection. Strongly recommended with chase pricing |
| postOnly | integer | N | 0=allow taker, 1=maker-only (earn rebates). Requires limit/chase pricing |
| reduceOnly | boolean | N | Only reduce position. Default: false |
| positionIdx | integer | N | 0=one-way, 1=hedge-long, 2=hedge-short |
| leverageType | integer | N | 0=normal, 1=spot margin. Only for UTA_SPOT |

```
POST /v5/strategy/create
{"category":"UTA_USDT","symbol":"BTCUSDT","side":"Sell","size":"10","strategyType":"iceberg","subSize":"1","limitPrice":"70000","postOnly":1}
```

### Chase Order

Dynamic price tracking for fast execution — chases best bid/ask.

> ⚠️ **CRITICAL**: The `strategyType` value MUST be `chaseOrder` (camelCase). Do NOT use `chase`, `chase_order`, or any other variation — they will be rejected. Always include `"strategyType":"chaseOrder"` in the request body.

**Required**: category, symbol, side, size, strategyType(`chaseOrder`), plus ONE of chaseDistance or chasePercentE4

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Y | `UTA_USDT`, `UTA_SPOT`, etc. |
| symbol | string | Y | e.g. `BTCUSDT` |
| side | string | Y | `Buy` or `Sell` |
| size | string | Y | Total quantity in base currency |
| strategyType | string | Y | **`chaseOrder`** (camelCase, NOT `chase`) |
| chaseDistance | string | One of | Absolute offset from best bid/ask. For low liquidity pairs |
| chasePercentE4 | integer | One of | Percentage offset in basis points (10=0.1%, 50=0.5%, 100=1%). Range: [1, 1000]. For high liquidity pairs |
| maxChasePrice | string | N | Price protection limit. Strongly recommended |
| triggerPrice | string | N | Start only when price reaches this level |
| reduceOnly | boolean | N | Only reduce position. Default: false |
| positionIdx | integer | N | 0=one-way, 1=hedge-long, 2=hedge-short |
| leverageType | integer | N | 0=normal, 1=spot margin. Only for UTA_SPOT |

> **Note**: chaseDistance and chasePercentE4 are mutually exclusive. If both provided, chaseDistance takes priority.

```
POST /v5/strategy/create
{"category":"UTA_USDT","symbol":"BTCUSDT","side":"Buy","size":"1","strategyType":"chaseOrder","chasePercentE4":50,"maxChasePrice":"90000"}
```

### POV (Percentage of Volume)

Adapts child order size to live market activity — execution rate scales with real-time volume.

> ⚠️ **POV only supports Perp**: `UTA_USDT`, `UTA_USDC`, `UTA_INVERSE`. NOT `UTA_SPOT`.

**Required**: category, symbol, side, strategyType(`pov`), povParams

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Y | `UTA_USDT`, `UTA_USDC`, `UTA_INVERSE` only |
| symbol | string | Y | e.g. `BTCUSDT` |
| side | string | Y | `Buy` or `Sell` |
| strategyType | string | Y | `pov` |
| size | string | N | Max quantity (maxQty). Required when interval>0 unless duration is set |
| duration | integer | N | Total time in seconds. Range: [900, 86400]. Required when interval>0 unless size is set |
| interval | integer | N | Seconds between orders. 0=OneTime mode (single child order then stop). Range: 0 or [5, 3600] |
| reduceOnly | boolean | N | Only reduce position. Default: false |
| positionIdx | integer | N | 0=one-way, 1=hedge-long, 2=hedge-short. Default: 0 |
| povParams | object | Y | POV-specific parameters (see below) |

**povParams object**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| mode | string | Y | `TradedVolume`, `OppositeSideLiquidity`, or `SameSideLiquidity` |
| participationRate | string | Y | Percentage `"1"`-`"100"`, max 1 decimal place |
| referenceWindow | string | Conditional | Seconds `"60"`-`"14400"`. Required when mode=`TradedVolume` |
| depthReference | integer | Conditional | Orderbook depth level 1-10. Required when mode=`OppositeSideLiquidity` or `SameSideLiquidity` |

**Execution logic by mode**:
- `TradedVolume` → Market order (childQty = volume in referenceWindow × participationRate%)
- `OppositeSideLiquidity` → Taker Limit order @BBO (childQty = opposite side depth × participationRate%)
- `SameSideLiquidity` → Post-Only order @BBO (childQty = same side depth × participationRate%)

> **interval=0 (OneTime)**: Places a single child order then stops immediately. No size/duration needed.
> **interval>0**: At least one of `size` or `duration` must be set as a stop condition.

```
POST /v5/strategy/create
{"category":"UTA_USDT","symbol":"BTCUSDT","side":"Buy","strategyType":"pov","size":"10","duration":3600,"interval":30,"povParams":{"mode":"TradedVolume","participationRate":"5","referenceWindow":"300"}}
```

---

## Query, Monitor & Stop

| Endpoint | Path | Method | Key Params |
|----------|------|--------|-----------|
| Strategy List | `/v5/strategy/list` | GET | strategyId, symbol, category(`UTA_*`), strategyType(`twap`/`iceberg`/`chaseOrder`/`pov`), status, beginTimeE0, endTimeE0, pageSize(max 50), cursor |
| Strategy Orders | `/v5/strategy/order-list` | GET | strategyId(**required**), status, symbol, BeginTimeE0, EndTimeE0, pageSize(max 50), cursor, StrategyType(`twap`/`iceberg`/`chaseOrder`/`pov`) |
| Stop Strategy | `/v5/strategy/stop` | POST | strategyId(**required**) |

### Strategy Status Codes

| Code | Status | Description                              |
|------|--------|------------------------------------------|
| 2 | Running | Actively executing orders                |
| 3, 4 | Terminated | Stopped (check terminateType for reason) |
| 5 | Paused | Temporarily halted, webhook only         |
| 6 | Untriggered | Waiting for trigger price condition      |

### Terminate Type Codes

| Code | Reason |
|------|--------|
| 0 | Not terminated |
| 1 | User manually stopped |
| 2 | Completed normally (all quantity filled) |
| 3 | Insufficient balance |
| 4 | Position closed |
| 5 | Risk control triggered |
| 6 | System error |
| 7 | Exceeded maxChasePrice |
| 8 | Hit limit price protection |
| 18 | Beyond maxChasePrice |
| 24 | TWAP hit limit price |
| 27 | POV maxDuration reached |
| 28 | POV maxQty reached |
| 29 | POV trading failed 6 consecutive times |
| 30 | POV OneTime mode executed |
| 31 | POV no fills in 24 hours |

### Order Status (for order-list)

| Code | Status |
|------|--------|
| 1 | Created (active) |
| 2 | PartiallyFilled |
| 3 | Filled |
| 4 | Cancelled |
| 5 | Rejected |

> ⚠️ **Stop behavior is PERMANENT and IRREVERSIBLE**: Calling `/v5/strategy/stop` permanently terminates the strategy — it **cannot be resumed**. All pending orders are canceled, partially filled orders cancel remaining portion. Filled orders unaffected. **Stopped strategies cannot be resumed under any circumstances** — you must create a new strategy. **There is NO pause/resume functionality available to users**; status=5 (Paused) is system-controlled only and cannot be triggered by user API calls. If a user asks to "pause" or "resume" a strategy, you MUST inform them that pausing and resuming is NOT possible — the only option is to permanently stop the current strategy and create a new one. Rate limit: 10 qps.

---

## Response Format

Strategy endpoints use the **standard V5 response format** (`retCode`/`retMsg`):

```json
{
  "retCode": 0,
  "retMsg": "success",
  "result": {
    "strategyId": "9e2ecb9e-d60c-4497-a82f-eaa0ea357397",
    "result": null
  },
  "retExtInfo": {},
  "time": 1774001864452
}
```

> **Note**: All strategy endpoints (create, list, stop) use standard `retCode`/`retMsg` (camelCase). The `result` object contains `strategyId` (UUID) and a nested `result: null`.

---

## POV Error Codes

| Code | Description |
|------|-------------|
| 60088 | Invalid mode |
| 60089 | participationRate out of range [1,100] or more than 1 decimal place |
| 60090 | referenceWindow or depthReference missing or invalid for selected mode |
| 60091 | Missing stop condition (size or duration) when interval>0 |
| 60092 | Estimated child qty out of [minQty, maxOrderQty] |
| 60093 | duration out of range [900, 86400] |
| 60094 | Estimated child qty exceeds maxQty |
| 60095 | interval exceeds duration |

---

## Notes

- `strategyId` is a UUID returned from the create response -- store it for query/stop calls
- Only `Running` (2) or `Untriggered` (6) strategies can be stopped
- **⚠️ Stopping a strategy is PERMANENT and irreversible — it cannot be resumed**
- TWAP: duration must be divisible by interval; min duration 300s
- Iceberg: requires ONE of subSize or orderCount; subSize must be < total size
- Chase: strategyType is `chaseOrder` (camelCase, NOT `chase`); generates frequent order cancellations/replacements (watch rate limits)
- Chase: many cancelled orders (status=4) is NORMAL behavior -- it cancels and replaces to track price
- chasePercentE4 and chaseDistance are mutually exclusive across all strategy types
- POV: only supports Perp (UTA_USDT/UTA_USDC/UTA_INVERSE), NOT spot; interval=0 is OneTime mode
- All size/price params are strings; duration/interval/chasePercentE4/orderCount/depthReference are integers
