# Module: Market Data

> This module is loaded on-demand by the Bybit Trading Skill. Public market-data endpoints require no authentication; the institutional connection-limit query requires a signed main-account API Key.

## Scenario: Check Market Data

User might say: "What's the BTC price?", "Show me ETH chart", "What's the current funding rate?"

**Get real-time price**
```
GET /v5/market/tickers?category=spot&symbol=BTCUSDT
GET /v5/market/tickers?category=linear&symbol=BTCUSDT  (derivatives)
```

**Get candlestick/kline data**
```
GET /v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=100
```
interval: `1` `3` `5` `15` `30` `60` `120` `240` `360` `720` `D` `W` `M` (minutes or day/week/month)

**Get funding rate**
```
GET /v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=10
```

**Get orderbook depth**
```
GET /v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=50
```

**Discover option underlyings**
```
GET /v5/market/option-base-coins
GET /v5/market/option-base-coins?underlyingType=2
```
Use the returned base coins instead of a hard-coded list. Check `hasSymbol=1` before querying `/v5/market/instruments-info?category=option&baseCoin=<baseCoin>`.

> Market data endpoints require no authentication and can be called directly.

---

## Scenario: Check Institutional Connection Limits

User might say: "Show our institutional WebSocket connection limits", "How many Spot SBE connections are in use?"

Use a signed **main-account API Key** and the V5 GET signing flow with an empty query string:
```
GET /v5/ins/connection-limit
```
Select separately configured, locally stored main-account credentials for this query only; keep the session's subaccount trading credentials and OAuth account unchanged. If only subaccount credentials are available, stop this query and guide the user to configure a separate main-account key locally, without requesting its secret in chat. Do not send `uid`, `ins_id`, any other business query parameter, or a request body. Check `retCode` before reading the result. Report each domain's Spot JSON, Spot SBE, Derivatives JSON, and Derivatives SBE counts separately, using the interpretation below. This read-only query needs no prerequisite write operation.

---

## API Reference

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Kline | `/v5/market/kline` | GET | symbol, interval | category, start, end, limit | spot, linear, inverse |
| Mark Price Kline | `/v5/market/mark-price-kline` | GET | category, symbol, interval | start, end, limit | linear, inverse |
| Index Price Kline | `/v5/market/index-price-kline` | GET | category, symbol, interval | start, end, limit | linear, inverse |
| Premium Index Kline | `/v5/market/premium-index-price-kline` | GET | category, symbol, interval | start, end, limit | linear |
| Instruments Info | `/v5/market/instruments-info` | GET | category | symbol, baseCoin, limit, cursor, status | spot, linear, inverse, option |
| Option Base Coins | `/v5/market/option-base-coins` | GET | — | underlyingType | option |
| Orderbook | `/v5/market/orderbook` | GET | category, symbol | limit | spot, linear, inverse, option |
| Tickers | `/v5/market/tickers` | GET | category | symbol, baseCoin, expDate | spot, linear, inverse, option |
| Funding Rate History | `/v5/market/funding/history` | GET | category, symbol | startTime, endTime, limit | linear, inverse |
| Recent Trades | `/v5/market/recent-trade` | GET | category, symbol | baseCoin, limit | spot, linear, inverse, option |
| Open Interest | `/v5/market/open-interest` | GET | category, symbol, intervalTime | startTime, endTime, limit, cursor | linear, inverse |
| Historical Volatility | `/v5/market/historical-volatility` | GET | category | baseCoin, period, startTime, endTime | option |
| Insurance Fund | `/v5/market/insurance` | GET | — | coin | — |
| Risk Limit | `/v5/market/risk-limit` | GET | category | symbol | linear, inverse |
| Delivery Price | `/v5/market/delivery-price` | GET | category | symbol, baseCoin, limit, cursor | linear, inverse, option |
| Long/Short Ratio | `/v5/market/account-ratio` | GET | category, symbol, period | limit | linear, inverse |
| Price Limit | `/v5/market/price-limit` | GET | symbol | category | linear, inverse |
| Index Components | `/v5/market/index-price-components` | GET | indexName | — | — |
| Fee Group | `/v5/market/fee-group-info` | GET | productType | groupId | — |
| New Delivery Price | `/v5/market/new-delivery-price` | GET | category, baseCoin | settleCoin | linear, inverse, option |
| ADL Alert | `/v5/market/adlAlert` | GET | — | symbol | linear, inverse |
| RPI Orderbook | `/v5/market/rpi_orderbook` | GET | symbol, limit | category | spot |
| Server Time | `/v5/market/time` | GET | — | — | — |
| System Status | `/v5/system/status` | GET | — | id, state | — |
| Announcements | `/v5/announcements/index` | GET | — | locale, type, tag, page, limit | — |
| Institutional Connection Limits | `/v5/ins/connection-limit` | GET | — | — | — |

## Endpoint Notes

### Institutional Connection Limits (`/v5/ins/connection-limit`)

- Authentication is required: use a signed main-account API Key; subaccounts are rejected with `10005`. The account identity comes from authentication, not a caller-supplied `uid` or `ins_id`.
- On `retCode=0`, `result` is a nonempty **array**, with no `result.list` wrapper. Each item contains `host` (institution/customer name), `endpointDomain` (domain without scheme or path), `spot.json`, `spot.sbe`, `derivative.json`, and `derivative.sbe`. Each protocol has non-negative integer `max` and `current`; products have no aggregate `max/current` or `protocols` wrapper.
- JSON and SBE capacity is independent: do not sum limits/counts or borrow unused capacity across protocols. Each derivatives protocol includes both linear and inverse connections. Counts cover the entire domain, not only the requesting API Key or UID, and count connections rather than subscription topics.
- Source defaults are `1500` per Spot protocol and `3000` per derivatives protocol. Valid domain-specific limits override defaults, including a valid `max=0`; unavailable limit configuration falls back to source defaults. `current` can exceed `max` and is not clipped.
- Missing, stale, invalid, or unavailable monitoring data returns integer `current=0`, never null or omitted. This fallback does **not** prove there are no live connections; `current=0` does not guarantee a new connection will be accepted.
- Domains are cached for 5 minutes. Tokyo (`TYO`) metrics refresh approximately every 60 seconds, with a maximum snapshot age of 120 seconds; backends refresh independently. The envelope's `time` is server response time, not metrics collection time. Tokyo collection failures do not fall back to other regions.
- The domain list currently includes GW, WS, and WS-Primary service types. A returned GW/API gateway domain does not establish WebSocket path support. The query does not open/close connections or modify limits, whitelists, or account state.
- Request limit: **1/s per UID + path, burst=1**. `X-Bapi-Limit`, `X-Bapi-Limit-Status`, and `X-Bapi-Limit-Reset-Timestamp` describe request allowance, not connection capacity; a successful request may have remaining allowance `0`. `Traceid` supports request correlation.
- HTTP 200 does not imply success. Non-zero business responses have `result={}`: `180001` means no eligible institution domains (not distinguishable from a missing institution), `10005` means main-account/permission failure, and `10016` means dependency lookup/data unavailable. Interpret `180001` in this endpoint's context; Alpha Prediction uses the same number for a different error. Standard V5 errors: `10002` timestamp/window, `10003` API Key, `10004` signature, `10006` request rate limit. HTTP `403` is gateway access denial; HTTP `429` is a gateway system rate limit. Reduce request frequency before retrying rate limits.

### Instruments Info (`/v5/market/instruments-info`)

- For `category=linear` or `inverse`, each instrument in `result.list` includes `tags`: `["ST"]` when the symbol has the ST tag, otherwise `[]`. This is a response field, not a request filter; do not assume it is available for spot or option instruments.

### Option Base Coins (`/v5/market/option-base-coins`)

- `underlyingType` is the only supported query parameter: integer `0` (crypto), `1` (commodity), `2` (stock), `3` (forex), or `4` (oil). Omit it to discover all available option base coins; do not send `category`.
- `result.list` contains `baseCoin`, `quoteCoin`, `settleCoin`, `optionShowName`, `optionOnlineTime` (milliseconds), `hasSymbol`, and `underlyingType`.
- `hasSymbol`: `0` means no tradable option symbols, `1` means tradable symbols exist. It is `0` when `optionOnlineTime` is `0` or is still in the future.
- Errors: `10001` means invalid parameters (check `underlyingType`); `10006` means rate limited (reduce request frequency and retry after a short delay).

## Enums

* **interval** (kline): `1` | `3` | `5` | `15` | `30` | `60` | `120` | `240` | `360` | `720` | `D` | `W` | `M`
* **intervalTime** (open interest): `5min` | `15min` | `30min` | `1h` | `4h` | `1d`
* **period** (long/short ratio): `5min` | `15min` | `30min` | `1h` | `4h` | `1d`
* **category**: `spot` | `linear` | `inverse` | `option`
