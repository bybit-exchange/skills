# Module: Strategy Orders

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Strategy Orders

User might say: "Split my BTC buy into smaller orders over 10 minutes", "Place an iceberg order", "Chase the best price", "Stop my strategy"

---

## Create Strategy

All strategy types share `POST /v5/strategy/create` with different `strategyType` values.

| Strategy | strategyType | Description | Key Params |
|----------|-------------|-------------|-----------|
| TWAP | `twap` | Split order evenly over time — reduces market impact | symbol, side, size, duration, interval |
| Iceberg | `iceberg` | Hide large order, show one child at a time — prevents front-running | symbol, side, size, subSize or orderCount |
| Chase | `chase` | Dynamic price tracking for fast execution — chases best bid/ask | symbol, side, size, maxChasePrice |

```
POST /v5/strategy/create
{"strategyType":"twap","symbol":"BTCUSDT","side":"Buy","size":"1","duration":300,"interval":60,"category":"linear"}
```

## Query, Monitor & Stop

| Endpoint | Path | Method | Key Params |
|----------|------|--------|-----------|
| Strategy List | `/v5/strategy/list` | GET | strategyId, symbol, category, strategyType, status |
| Strategy Orders | `/v5/strategy/order-list` | GET | strategyId |
| Stop Strategy | `/v5/strategy/stop` | POST | strategyId |

> **Stop behavior**: status → `Terminated`, all pending orders canceled, partially filled orders cancel remaining portion. Filled orders unaffected. **Stopped strategies cannot be resumed** — must create a new one. Rate limit: 10 qps.

**Strategy status**: `Running` `Terminated` `Paused` `Untriggered`

---

## Notes

- `strategyId` is a UUID returned from the create response — store it for query/stop calls
- Only `Running` or `Untriggered` strategies can be stopped
- TWAP supports optional randomization to avoid detection patterns
- Iceberg supports limit or chase pricing for child orders
- Chase includes `maxChasePrice` protection to limit worst-case execution price
