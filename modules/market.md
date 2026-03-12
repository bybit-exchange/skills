# Module: Market Data

> This module is loaded on-demand by the Bybit Trading Skill. No authentication required for these endpoints.

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

> Market data endpoints require no authentication and can be called directly.

---

## API Reference

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Kline | `/v5/market/kline` | GET | symbol, interval | category, start, end, limit | spot, linear, inverse |
| Mark Price Kline | `/v5/market/mark-price-kline` | GET | category, symbol, interval | start, end, limit | linear, inverse |
| Index Price Kline | `/v5/market/index-price-kline` | GET | category, symbol, interval | start, end, limit | linear, inverse |
| Premium Index Kline | `/v5/market/premium-index-price-kline` | GET | category, symbol, interval | start, end, limit | linear |
| Instruments Info | `/v5/market/instruments-info` | GET | category | symbol, baseCoin, limit, cursor, status | spot, linear, inverse, option |
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

## Enums

* **interval** (kline): `1` | `3` | `5` | `15` | `30` | `60` | `120` | `240` | `360` | `720` | `D` | `W` | `M`
* **intervalTime** (open interest): `5min` | `15min` | `30min` | `1h` | `4h` | `1d`
* **period** (long/short ratio): `5min` | `15min` | `30min` | `1h` | `4h` | `1d`
* **category**: `spot` | `linear` | `inverse` | `option`
