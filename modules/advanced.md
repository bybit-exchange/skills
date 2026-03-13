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
| `position` | Position changes |
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

### Crypto Loan — Fixed Term (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Borrow Contract Info | `/v5/crypto-loan-fixed/borrow-contract-info` | GET | orderCurrency | — |
| Borrow Order Quote | `/v5/crypto-loan-fixed/borrow-order-quote` | GET | orderCurrency | orderBy |
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
| Cancel Supply | `/v5/crypto-loan-fixed/supply-order-cancel` | POST | orderId | — |

### Crypto Loan — Flexible (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Repay | `/v5/crypto-loan-flexible/repay` | POST | loanCoin, repayAmount | — |
| Repay Collateral | `/v5/crypto-loan-flexible/repay-collateral` | POST | orderId | — |
| Ongoing Coins | `/v5/crypto-loan-flexible/ongoing-coin` | GET | — | loanCurrency |
| Borrow History | `/v5/crypto-loan-flexible/borrow-history` | GET | — | limit |
| Repayment History | `/v5/crypto-loan-flexible/repayment-history` | GET | — | loanCurrency |

---

## Institutional Loan (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Product Info | `/v5/ins-loan/product-infos` | GET | — | productId |
| Margin Coin Conversion | `/v5/ins-loan/ensure-tokens-convert` | GET | — | loanOrderId |
| Loan Order | `/v5/ins-loan/loan-order` | GET | — | orderId, startTime, endTime, limit |
| Repayment History | `/v5/ins-loan/repaid-history` | GET | — | startTime, endTime, limit |
| LTV Conversion | `/v5/ins-loan/ltv-convert` | GET | — | — |
| Margin Coin Info | `/v5/ins-loan/ensure-tokens` | GET | — | productId |
| LTV | `/v5/ins-loan/ltv` | GET | — | — |
| Repay | `/v5/ins-loan/repay-loan` | POST | — | — |

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

---

## Broker (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Earnings Info | `/v5/broker/earnings-info` | GET | — | bizType, startTime, endTime, limit, cursor |
| Account Info | `/v5/broker/account-info` | GET | — | — |
| Voucher Info | `/v5/broker/award/info` | GET | awardId | — |
| Distribution Record | `/v5/broker/award/distribution-record` | GET | — | awardId, startTime, endTime, limit, cursor |
| All Rate Limits | `/v5/broker/apilimit/query-all` | GET | — | limit, cursor, uids |
| Rate Limit Cap | `/v5/broker/apilimit/query-cap` | GET | — | — |
| Set Rate Limit | `/v5/broker/apilimit/set` | POST | list | — |

---

## Enums

* **direction** (collateral adjust): `ADD` | `REDUCE`
* **cancelType**: `CancelByUser` | `CancelByReduceOnly` | `CancelByPrepareLiq` | `CancelByPrepareAdl` | `CancelByAdmin` | `CancelBySettle` | `CancelByTpSlTsClear` | `CancelBySmp` | `CancelByDCP`
