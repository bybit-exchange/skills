# Module: Advanced Features

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required for most endpoints.

## WebSocket

Use WebSocket when real-time push is needed. The REST API covers most scenarios.

### Public Stream

URL: `wss://stream.bybit.com/v5/public/{category}`
Testnet: `wss://stream-testnet.bybit.com/v5/public/{category}`

| Topic | Format | Description |
|-------|--------|-------------|
| Orderbook | `orderbook.{depth}.{symbol}` | depth: 1, 50, 200, 500 |
| Trades | `publicTrade.{symbol}` | Real-time trades |
| Tickers | `tickers.{symbol}` | Ticker updates |
| Kline | `kline.{interval}.{symbol}` | Candlestick updates |
| Liquidation | `liquidation.{symbol}` | Liquidation events |

### Private Stream

URL: `wss://stream.bybit.com/v5/private`

| Topic | Description |
|-------|-------------|
| `position` | Position changes (payload includes `netDeltaRatio`, all categories) |
| `execution` | Execution updates |
| `order` | Order status updates |
| `wallet` | Balance changes |

Subscribe: `{"op": "subscribe", "args": ["orderbook.50.BTCUSDT"]}`
Heartbeat: Send `{"op": "ping"}` every 20 seconds
Auth: `{"op": "auth", "args": ["<apiKey>", "<expires>", "<signature>"]}`

---

## Crypto Loan

| Endpoint | Path | Method | Required Params | Optional Params | Auth | Status |
|----------|------|--------|----------------|-----------------|------|--------|
| Repay | `/v5/crypto-loan/repay` | POST | orderId, repayAmount | — | Yes | Current |
| Adjust LTV | `/v5/crypto-loan/adjust-ltv` | POST | currency, amount, direction | — | Yes | Current |
| Ongoing Orders | `/v5/crypto-loan/ongoing-orders` | GET | — | orderId, limit, cursor | Yes | Current |
| Borrow History | `/v5/crypto-loan/borrow-history` | GET | — | currency, limit, cursor | Yes | Current |
| Repayment History | `/v5/crypto-loan/repayment-history` | GET | — | orderId, limit, cursor | Yes | Current |
| Adjustment History | `/v5/crypto-loan/adjustment-history` | GET | — | currency, limit, cursor | Yes | Current |
| Loanable Data | `/v5/crypto-loan/loanable-data` | GET | — | — | No | Current |
| Collateral Data | `/v5/crypto-loan/collateral-data` | GET | — | — | No | Current |
| Max Collateral Amount | `/v5/crypto-loan/max-collateral-amount` | GET | currency | — | Yes | Current |
| Borrowable & Collateralisable | `/v5/crypto-loan/borrowable-collateralisable-number` | GET | — | — | Yes | Current |

### Crypto Loan — Common (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Position | `/v5/crypto-loan-common/position` | GET | — | — |
| Collateral Data | `/v5/crypto-loan-common/collateral-data` | GET | — | — |
| Loanable Data | `/v5/crypto-loan-common/loanable-data` | GET | — | — |
| Max Collateral Amount | `/v5/crypto-loan-common/max-collateral-amount` | GET | currency | — |
| Max Loan | `/v5/crypto-loan-common/max-loan` | GET | currency | — |
| Adjust LTV | `/v5/crypto-loan-common/adjust-ltv` | POST | currency, amount, direction | — |
| Adjustment History | `/v5/crypto-loan-common/adjustment-history` | GET | — | currency, limit, cursor |

> **`loanable-data` is where interest rates live** — `flexibleAnnualizedInterestRate` (flexible loans) and `annualizedInterestRate7D`/`14D`/`30D`/`60D`/`90D`/`180D` (fixed terms), plus `minFlexibleBorrowingAmount` and `flexibleBorrowingAccuracy`. Quote rates from here. The `available-inventory` endpoints in the Fixed Term / Flexible sections return **pool capacity only** and carry no rate.

### Crypto Loan — Fixed Term (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Borrow Contract Info | `/v5/crypto-loan-fixed/borrow-contract-info` | GET | orderCurrency | — |
| Borrow Order Quote | `/v5/crypto-loan-fixed/borrow-order-quote` | GET | orderCurrency | orderBy |
| Available Inventory | `/v5/crypto-loan-fixed/available-inventory` | GET | currency, term, annualRate | — |
| Place Borrow | `/v5/crypto-loan-fixed/borrow` | POST | orderCurrency, orderAmount, annualRate, term, collateralList | autoRepay, repayType, strategyType |
| Borrow Order Info | `/v5/crypto-loan-fixed/borrow-order-info` | GET | — | orderId |
| Cancel Borrow | `/v5/crypto-loan-fixed/borrow-order-cancel` | POST | orderId | — |
| Full Repay | `/v5/crypto-loan-fixed/fully-repay` | POST | orderId | — |
| Repay Collateral | `/v5/crypto-loan-fixed/repay-collateral` | POST | orderId | — |
| Repayment History | `/v5/crypto-loan-fixed/repayment-history` | GET | — | repayId |
| Renewal Info | `/v5/crypto-loan-fixed/renew-info` | GET | orderId | — |
| Renew | `/v5/crypto-loan-fixed/renew` | POST | orderId | — |
| Supply Contract Info | `/v5/crypto-loan-fixed/supply-contract-info` | GET | supplyCurrency | — |
| Supply Order Quote | `/v5/crypto-loan-fixed/supply-order-quote` | GET | orderCurrency | orderBy |
| Supply Order Info | `/v5/crypto-loan-fixed/supply-order-info` | GET | — | orderId |
| Place Supply | `/v5/crypto-loan-fixed/supply` | POST | orderCurrency, orderAmount, annualRate, term | availableSource |
| Cancel Supply | `/v5/crypto-loan-fixed/supply-order-cancel` | POST | orderId | refundedAccount |

> **Place Supply `availableSource`**: `0` funding account (default), `1` flexible savings, `2` mixed (funding + flexible savings).
> **Cancel Supply `refundedAccount`** (only effective when order was placed from flexible savings): `0` redeem to funding account (default), `1` keep in flexible savings (unfreeze).
> **Place Borrow `term`**: `7|14|30|60|90|180` (days). `autoRepay`: `0` manual, `1` auto-repay. `repayType`: `1` normal repay. `strategyType`: `PARTIAL` allow partial fill (default) | `FULL` full fill only. `collateralList` is a non-empty array of `{currency, amount}`. Check Borrow Order Quote for available rates first.
> **Available Inventory `term`**: `7|14|30|90|180` (days); `annualRate` decimal (e.g. `0.02` = 2%). Returns lending-pool `availableInventory` = min(market available + financial trial, user remaining borrow limit).
> **Error `148048`**: "The collateral amount has exceeded the platform limit" — applies to borrow, renew, and adjust-LTV operations.

### Crypto Loan — Flexible (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Place Borrow | `/v5/crypto-loan-flexible/borrow` | POST | loanCurrency, loanAmount, collateralList | — |
| Repay | `/v5/crypto-loan-flexible/repay` | POST | loanCoin, repayAmount | — |
| Repay Collateral | `/v5/crypto-loan-flexible/repay-collateral` | POST | orderId | — |
| Available Inventory | `/v5/crypto-loan-flexible/available-inventory` | GET | currency | — |
| Ongoing Coins | `/v5/crypto-loan-flexible/ongoing-coin` | GET | — | loanCurrency |
| Borrow History | `/v5/crypto-loan-flexible/borrow-history` | GET | — | orderId, loanCurrency, limit, cursor |
| Repayment History | `/v5/crypto-loan-flexible/repayment-history` | GET | — | repayId, loanCurrency, limit, cursor |

**Place Borrow notes** (`/v5/crypto-loan-flexible/borrow`)

Flexible = hourly floating rate, repay anytime with no penalty, interest accrued on actual duration. Use this instead of `crypto-loan-fixed/borrow` when the user wants short-term or open-ended borrowing.

- `loanCurrency`: currency to borrow (`USDT`, `BTC`, `ETH`, …) · `loanAmount`: full-precision string
- `collateralList`: array, each item requires **both** `currency` and `amount` (full-precision strings). Multiple collateral currencies are supported.
- Returns `result.orderId` — use it with `borrow-history` to track the order
- Rate limit: **1 request per time window per UID**
- **Rate, minimum and precision come from `GET /v5/crypto-loan-common/loanable-data`** — fields `flexibleAnnualizedInterestRate`, `minFlexibleBorrowingAmount`, `flexibleBorrowingAccuracy`. Quote the rate from there before showing the confirmation card, and use the minimum/precision to avoid `148002` / `148003`.
- `available-inventory` returns **only pool capacity** (`currency`, `availableInventory`, `updateTime`) — **it carries no rate.** Use it to check the pool can cover the amount, never to quote an interest rate.
- Compute LTV before borrowing — the rate floats hourly, so re-read it if the user takes a while to confirm

```
POST /v5/crypto-loan-flexible/borrow
{"loanCurrency":"USDT","loanAmount":"10000","collateralList":[{"currency":"BTC","amount":"0.5"}]}
```

Error codes: `148001` currency not supported for flexible loan · `148002` amount below minimum · `148003` amount exceeds precision · `148004` collateral currency not supported · `148005` collateral amount exceeds precision · `148009` LTV exceeds threshold · `148010` insufficient user quota · `148011` insufficient lending pool balance · `148012` insufficient collateral amount · `148013` non-borrowing users cannot operate · `148014` currency not supported · `148020` insufficient platform quota · `148021` operation conflict · `148031` operation not allowed during liquidation · `148048` collateral amount exceeded platform limit (transfer in other supported assets as collateral) · `100109` copy-trading users cannot use crypto loan · `10006` rate limit exceeded · `10016` server error.

---

## Institutional Loan (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Product Info | `/v5/ins-loan/product-infos` | GET | — | productId |
| Margin Coin Conversion | `/v5/ins-loan/ensure-tokens-convert` | GET | — | productId |
| Margin Coin Info | `/v5/ins-loan/ensure-tokens` | GET | — | productId |
| Loan Order | `/v5/ins-loan/loan-order` | GET | — | orderId, startTime, endTime, limit |
| Repayment History | `/v5/ins-loan/repaid-history` | GET | — | startTime, endTime, limit |
| LTV Conversion | `/v5/ins-loan/ltv-convert` | GET | — | — |
| Coin Delta Amount | `/v5/ins-loan/coin-delta-amount` | GET | — | coin |
| Association UID | `/v5/ins-loan/association-uid` | POST | uid, operate | — |
| Repay | `/v5/ins-loan/repay-loan` | POST | token, quantity | — |

> **Association UID `operate`**: `0` = bind UID, `1` = unbind UID. Rate limit: 1 req/s.
> **Coin Delta Amount**: Returns per-coin delta hedging limits (`coinDeltaSize`, `coinDeltaAvailableAmount`), aggregate `riskUnitDeltaAmount` / `riskUnitDeltaAvailableAmount`, and `riskUnitDelta` (risk unit delta value).
> **Product Info `productType`**: `0` = Default, `1` = CTA, `2` = Hedge.

---

## RFQ — Block Trading (authentication required, 50/s)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Create RFQ | `/v5/rfq/create-rfq` | POST | baseCoin, legs[] | rfqId, quoteExpiry | option |
| Cancel RFQ | `/v5/rfq/cancel-rfq` | POST | rfqId | — | option |
| Cancel All RFQs | `/v5/rfq/cancel-all-rfq` | POST | — | — | option |
| Create Quote | `/v5/rfq/create-quote` | POST | rfqId, legs[] | — | option |
| Execute Quote | `/v5/rfq/execute-quote` | POST | rfqId, quoteId | — | option |
| Cancel Quote | `/v5/rfq/cancel-quote` | POST | quoteId | — | option |
| Cancel All Quotes | `/v5/rfq/cancel-all-quotes` | POST | — | — | option |
| RFQ Realtime | `/v5/rfq/rfq-realtime` | GET | — | rfqId, baseCoin, side, limit | option |
| RFQ History | `/v5/rfq/rfq-list` | GET | — | rfqId, startTime, endTime, limit, cursor | option |
| Quote Realtime | `/v5/rfq/quote-realtime` | GET | — | quoteId, rfqId, baseCoin, limit | option |
| Quote History | `/v5/rfq/quote-list` | GET | — | quoteId, startTime, endTime, limit, cursor | option |
| Trade List | `/v5/rfq/trade-list` | GET | — | rfqId, startTime, endTime, limit, cursor | option |
| Public Trades | `/v5/rfq/public-trades` | GET | — | baseCoin, category, limit | option |
| Config | `/v5/rfq/config` | GET | — | — | option |
| Accept Non-LP Quote | `/v5/rfq/accept-other-quote` | POST | rfqId | — | option |

---

## Spread Trade (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Place Order | `/v5/spread/order/create` | POST | symbol, side, orderType, qty | price, orderLinkId, timeInForce | linear |
| Amend Order | `/v5/spread/order/amend` | POST | symbol | orderId, orderLinkId, qty, price | linear |
| Cancel Order | `/v5/spread/order/cancel` | POST | — | orderId, orderLinkId | linear |
| Cancel All Orders | `/v5/spread/order/cancel-all` | POST | — | symbol, cancelAll | linear |
| Get Open Orders | `/v5/spread/order/realtime` | GET | — | symbol, baseCoin, orderId, limit, cursor | linear |
| Order History | `/v5/spread/order/history` | GET | — | symbol, baseCoin, orderId, startTime, endTime, limit, cursor | linear |
| Execution History | `/v5/spread/execution/list` | GET | — | symbol, orderId, startTime, endTime, limit, cursor | linear |
| Instruments Info | `/v5/spread/instrument` | GET | — | symbol, baseCoin, limit, cursor | linear |
| Orderbook | `/v5/spread/orderbook` | GET | symbol, limit | — | linear |
| Tickers | `/v5/spread/tickers` | GET | symbol | — | linear |
| Recent Trades | `/v5/spread/recent-trade` | GET | symbol | limit | linear |
| Max Qty (Wallet Balance) | `/v5/spread/max-qty` | GET | symbol, side, orderPrice | — | linear |

### Spread Trade — Max Qty Notes

- **Purpose**: Query the spread wallet available balance (`ab`) for a given symbol and side before placing an order. Use this to validate order size against available funds.
- **`side` enum**: `1` = Buy, `2` = Sell
- **`ab` field**: Returned available balance is truncated to 8 decimal places (not rounded).
- **Typical flow**: Call `/v5/spread/max-qty` with the target `symbol`, `side`, and intended `orderPrice` → use the returned `ab` to determine the maximum allowable qty → then call `/v5/spread/order/create`.

---

## Broker (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Earnings Info | `/v5/broker/earnings-info` | GET | — | bizType, begin, end, uid, limit, cursor |
| Account Info | `/v5/broker/account-info` | GET | — | — |
| Voucher Info | `/v5/broker/award/info` | GET | awardId | — |
| Distribution Record | `/v5/broker/award/distribution-record` | GET | — | awardId, startTime, endTime, limit, cursor |
| All Rate Limits | `/v5/broker/apilimit/query-all` | GET | — | limit, cursor, uids |
| Rate Limit Cap | `/v5/broker/apilimit/query-cap` | GET | — | — |
| Set Rate Limit | `/v5/broker/apilimit/set` | POST | list | — |

### Earnings Info (`/v5/broker/earnings-info`)
- **Date params are `begin` / `end`, NOT `startTime` / `endTime`**, and the format is `YYYYMMDD` (e.g. `"20240131"`), not milliseconds. They must be supplied **together or not at all** (`3500407` otherwise); omitting both returns the latest 7 days.
- `bizType`: `SPOT` | `DERIVATIVES` | `OPTIONS` | `CONVERT`. If not provided, all types are returned.
- `uid`: broker subaccount UID. If not provided, returns data for all subaccounts.
- `limit`: `1`–`1000` (out of range → `3500402`). `cursor`: use `nextPageCursor` from the previous response, **URL-encoded**. An empty `nextPageCursor` means last page.
- Requires an **exchange broker master account** (`3500403` otherwise). Data covers up to the past 1 month until T-1 (`3500406` if the range exceeds it); older data requires contacting your Relationship Manager.
- `details[].earning` is the **total** commission and equals `baseFeeEarning + markupEarning`. Rebate amounts have trailing zeros stripped.
- `totalEarningCat` groups totals by business type (`spot`, `derivatives`, `options`, `convert`, `total`) within the queried range; `total` is aggregated by coin across all types.
- Error codes: `3500402` invalid `limit` · `3500403` not an exchange broker master account · `3500404` invalid cursor · `3500406` out of query time range · `3500407` `begin`/`end` not supplied as a pair.

---

## Enums

* **direction** (collateral adjust): `ADD` | `REDUCE`
* **cancelType**: `CancelByUser` | `CancelByReduceOnly` | `CancelByPrepareLiq` | `CancelByPrepareAdl` | `CancelByAdmin` | `CancelBySettle` | `CancelByTpSlTsClear` | `CancelBySmp` | `CancelByDCP`
* **spread side** (max-qty): `1` = Buy | `2` = Sell
