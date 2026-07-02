# Module: Account & Asset Management

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Account & Asset Management

User might say: "Check my balance", "Transfer from spot to derivatives", "Show today's trade history"

**View wallet balance**
```
GET /v5/account/wallet-balance?accountType=UNIFIED
```

**View fee rate**
```
GET /v5/account/fee-rate?category=linear&symbol=BTCUSDT
```

**Internal transfer (spot <-> derivatives <-> funding account)**
```
POST /v5/asset/transfer/inter-transfer
{"transferId":"uuid","coin":"USDT","amount":"1000","fromAccountType":"UNIFIED","toAccountType":"FUND"}
```

**View trade history**
```
GET /v5/execution/list?category=linear&symbol=BTCUSDT
```

**View realized PnL**
```
GET /v5/position/closed-pnl?category=linear&symbol=BTCUSDT
```

**Fixed-rate borrow (borrow USDT at fixed rate for 7 days)**
```
POST /v5/spot-margin-trade/fixedborrow
{"orderCurrency":"USDT","orderAmount":"1000","annualRate":"0.02","term":"7","repayType":"1","strategyType":"PARTIAL"}
```

**Query borrow liability breakdown**
```
GET /v5/spot-margin-trade/liability?currency=USDT
```

**Repay with repayment type (fixed-rate liabilities only)**
```
POST /v5/account/repay
{"coin":"USDT","amount":"100","repaymentType":"FIXED"}
```

---

## API Reference

### Account (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Wallet Balance | `/v5/account/wallet-balance` | GET | accountType | coin | — |
| Asset Overview | `/v5/asset/asset-overview` | GET | — | accountType, memberId, valuationCurrency | — |
| Account Info | `/v5/account/info` | GET | — | — | — |
| Borrow History | `/v5/account/borrow-history` | GET | — | currency, startTime, endTime, limit, cursor | — |
| Set Collateral | `/v5/account/set-collateral-switch` | POST | coin, collateralSwitch | — | — |
| Collateral Info | `/v5/account/collateral-info` | GET | — | currency | — |
| Coin Greeks | `/v5/asset/coin-greeks` | GET | — | baseCoin | option |
| Fee Rate | `/v5/account/fee-rate` | GET | category | symbol, baseCoin | spot, linear, inverse, option |
| Transaction Log | `/v5/account/transaction-log` | GET | — | accountType, category, currency, baseCoin, type, startTime, endTime, limit, cursor | — |
| Contract Transaction Log | `/v5/account/contract-transaction-log` | GET | — | currency, baseCoin, type, startTime, endTime, limit, cursor | — |
| Set Margin Mode | `/v5/account/set-margin-mode` | POST | setMarginMode | — | — |
| Set MMP | `/v5/account/mmp-modify` | POST | baseCoin, window, frozenPeriod, qtyLimit, deltaLimit | — | option |
| Reset MMP | `/v5/account/mmp-reset` | POST | baseCoin | — | option |
| MMP State | `/v5/account/mmp-state` | GET | baseCoin | — | option |
| Account Instruments Info | `/v5/account/instruments-info` | GET | category | symbol, limit, cursor | spot, linear, inverse, option |
| DCP Info | `/v5/account/query-dcp-info` | GET | — | — | — |
| SMP Group | `/v5/account/smp-group` | GET | — | — | — |
| Trading Behavior Config | `/v5/account/user-setting-config` | GET | — | — | — |
| Transferable Amount | `/v5/account/withdrawal` | GET | coinName | — | — |
| Manual Borrow | `/v5/account/borrow` | POST | coin, amount | — | — |
| Manual Repay | `/v5/account/repay` | POST | — | coin, amount, repaymentType | — |
| No-Convert Repay | `/v5/account/no-convert-repay` | POST | coin | amount, repaymentType | — |
| Quick Repay | `/v5/account/quick-repayment` | POST | — | coin | — |
| Batch Set Collateral | `/v5/account/set-collateral-switch-batch` | POST | request[] | — | — |
| Set Spot Hedging | `/v5/account/set-hedging-mode` | POST | setHedgingMode | — | spot |
| Set Price Limit Action | `/v5/account/set-limit-px-action` | POST | category, modifyEnable | — | linear, inverse |
| Set Delta Neutral Mode | `/v5/account/set-delta-mode` | POST | deltaHedgeMode | — | option |
| Apply Demo Funds | `/v5/account/demo-apply-money` | POST | — | adjustType, utaDemoApplyMoney | — |
| Option Asset Info | `/v5/account/option-asset-info` | GET | — | — | option |
| Pay Info | `/v5/account/pay-info` | GET | — | coin | — |
| Trade Info For Analysis | `/v5/account/trade-info-for-analysis` | GET | — | symbol | startTime, endTime |

### Asset (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Funding History | `/v5/asset/fundinghistory` | GET | — | coin, startTime, endTime, limit, cursor | — |
| Coin Exchange Record | `/v5/asset/exchange/order-record` | GET | — | fromCoin, toCoin, limit, cursor | — |
| Delivery Record | `/v5/asset/delivery-record` | GET | category | symbol, expDate, limit, cursor | linear, inverse, option |
| USDC Settlement Record | `/v5/asset/settlement-record` | GET | category | symbol, limit, cursor | linear |
| Internal Transfer Record | `/v5/asset/transfer/query-inter-transfer-list` | GET | — | transferId, coin, status, startTime, endTime, limit, cursor | — |
| Spot Asset | `/v5/asset/transfer/query-asset-info` | GET | accountType | coin | — |
| All Balances | `/v5/asset/transfer/query-account-coins-balance` | GET | accountType | memberId, coin, withBonus | — |
| Single Coin Balance | `/v5/asset/transfer/query-account-coin-balance` | GET | accountType, coin | memberId, toAccountType, toMemberId, withBonus | — |
| Transferable Coins | `/v5/asset/transfer/query-transfer-coin-list` | GET | fromAccountType, toAccountType | — | — |
| Internal Transfer | `/v5/asset/transfer/inter-transfer` | POST | transferId, coin, amount, fromAccountType, toAccountType | — | — |
| Sub-account List | `/v5/asset/transfer/query-sub-member-list` | GET | — | — | — |
| Deposit Coins | `/v5/asset/deposit/query-allowed-list` | GET | — | coin, chain, cursor, limit | — |
| Set Deposit Account | `/v5/asset/deposit/deposit-to-account` | POST | accountType | — | — |
| Deposit Record | `/v5/asset/deposit/query-record` | GET | — | coin, startTime, endTime, limit, cursor | — |
| Sub-account Deposit Record | `/v5/asset/deposit/query-sub-member-record` | GET | subMemberId | coin, startTime, endTime, limit, cursor | — |
| Internal Deposit Record | `/v5/asset/deposit/query-internal-record` | GET | — | startTime, endTime, coin, cursor, limit | — |
| Master Deposit Address | `/v5/asset/deposit/query-address` | GET | coin | chainType | — |
| Sub-account Deposit Address | `/v5/asset/deposit/query-sub-member-address` | GET | coin, chainType, subMemberId | — | — |
| Coin Info | `/v5/asset/coin/query-info` | GET | — | coin | — |
| Withdrawal Record | `/v5/asset/withdraw/query-record` | GET | — | withdrawID, coin, withdrawType, startTime, endTime, limit, cursor | — |
| Withdrawable Amount | `/v5/asset/withdraw/withdrawable-amount` | GET | coin | — | — |
| Withdrawal Address List | `/v5/asset/withdraw/query-address` | GET | — | coin, chain, addressType, limit, cursor | — |
| VASP List | `/v5/asset/withdraw/vasp/list` | GET | — | — | — |
| Internal Transfer Record v2 | `/v5/asset/transfer/inter-transfer-list-query` | GET | — | coin, limit | — |
| Small Balance List | `/v5/asset/covert/small-balance-list` | GET | accountType | fromCoin | — |
| Small Balance Quote | `/v5/asset/covert/get-quote` | POST | accountType, fromCoinList, toCoin | — | — |
| Small Balance Convert | `/v5/asset/covert/small-balance-execute` | POST | quoteId | — | — |
| Small Balance History | `/v5/asset/covert/small-balance-history` | GET | — | accountType, quoteId, startTime, endTime, cursor, size | — |
| Exchange Coin List | `/v5/asset/exchange/query-coin-list` | GET | accountType | coin, side | — |
| Exchange Quote | `/v5/asset/exchange/quote-apply` | POST | accountType, fromCoin, toCoin, requestCoin, requestAmount | fromCoinType, toCoinType | — |
| Exchange Execute | `/v5/asset/exchange/convert-execute` | POST | quoteTxId | — | — |
| Exchange Result | `/v5/asset/exchange/convert-result-query` | GET | quoteTxId, accountType | — | — |
| Exchange History | `/v5/asset/exchange/query-convert-history` | GET | — | accountType, index, limit | — |
| Exchange Convert Limit | `/v5/asset/exchange/query-convert-limit` | GET | fromCoin, toCoin, accountType | — | — |
| Exchange Order List | `/v5/asset/exchange/query-order-list` | GET | accountType | index, limit | — |
| Portfolio Margin | `/v5/asset/portfolio-margin` | GET | — | baseCoin | — |
| Total Members Assets | `/v5/asset/total-members-assets` | GET | — | coin | — |

### Spot Margin Trade – Fixed-Rate Borrow (authentication required, Unified account only)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Fixed-Rate Borrow | `/v5/spot-margin-trade/fixedborrow` | POST | orderCurrency, orderAmount, annualRate, term, repayType, strategyType | — | — |
| Renew Fixed-Rate Borrow | `/v5/spot-margin-trade/fixedborrow-renew` | POST | loanId | qty | — |
| Query Fixed-Rate Borrow Market | `/v5/spot-margin-trade/fixedborrow-order-quote` | GET | orderCurrency, orderBy | term, sort, limit | — |
| Query Fixed-Rate Borrow Orders | `/v5/spot-margin-trade/fixedborrow-order-info` | GET | — | orderId, orderCurrency, state, term, limit, cursor | — |
| Query Fixed-Rate Borrow Contracts | `/v5/spot-margin-trade/fixedborrow-contract-info` | GET | — | orderId, orderCurrency, term, limit, cursor | — |
| Query Borrow Liability | `/v5/spot-margin-trade/liability` | GET | currency | — | — |
| Query Fixed-Rate Available Inventory | `/v5/spot-margin-trade/fixed-available-inventory` | GET | currency, term, annualRate | — | — |

### User (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Sub-account List | `/v5/user/query-sub-members` | GET | — | — | — |
| API Key Info | `/v5/user/query-api` | GET | — | — | — |
| Member Type | `/v5/user/get-member-type` | GET | — | — | — |
| Affiliate User Info | `/v5/user/aff-customer-info` | GET | uid | coin, business | — |
| Affiliate Sub List | `/v5/affiliate/affiliate-sub-list` | GET | — | cursor, size, startDate, endDate, subAffId | — |
| Sub-account List (full) | `/v5/user/submembers` | GET | — | pageSize, nextCursor | — |
| Sub-account All Keys | `/v5/user/sub-apikeys` | GET | subMemberId | limit, cursor | — |
| Escrow Sub-accounts | `/v5/user/escrow_sub_members` | GET | — | pageSize, nextCursor | — |
| Create Demo Account | `/v5/user/create-demo-member` | POST | — | — | — |
| Affiliate User List | `/v5/affiliate/aff-user-list` | GET | — | size, cursor, need365, need30, needDeposit, startDate, endDate | — |
| Referral List | `/v5/user/invitation/referrals` | GET | — | limit, cursor | — |
| Sign Agreement | `/v5/user/agreement` | POST | agree, category | — | — |

## Endpoint Notes

### Asset Overview (`/v5/asset/asset-overview`)
- Parameters updated: `category` and `coin` replaced by `accountType`, `memberId`, and `valuationCurrency`.
- `accountType` accepts comma-separated values: `SPOT`, `UNIFIED`, `FUND`, `CONTRACT`, `INVESTMENT`, `OPTION`. If omitted, returns all account types.
- `memberId` specifies a sub-account to query. If API key belongs to a sub-account, must match own UID or be omitted.
- `valuationCurrency` defaults to `USD` if not provided.
- Accounts with zero balance are filtered out, except for `UNIFIED` and `FUND` account types.

### Trading Behavior Config (`/v5/account/user-setting-config`)
- Response now includes additional fields: `lpaSpot` (spot LPA switch), `lpaPerp` (perpetual LPA switch), `smsef` (spot MNT fee deduction switch), `fmsef` (futures/contract MNT fee deduction switch), `deltaEnable` (delta account mode status).

### Option Asset Info (`/v5/account/option-asset-info`)
- No parameters required. Returns option asset PNL information grouped by coin, including `totalDelta`, `totalRPL`, `totalUPL`, `assetIM`, `assetMM` per coin.

### Pay Info (`/v5/account/pay-info`)
- Returns repayment (pay) information including collateral details per coin: `availableSize`, `availableValue`, `coinScale`, `borrowSize`, `spotHedgeAmount`, `assetFrozen`.
- If `coin` is not specified, returns all repayment info.

### Trade Info For Analysis (`/v5/account/trade-info-for-analysis`)
- Returns trade analysis data for a given symbol including buy/sell execution statistics, PNL, and daily summary.
- All parameters optional. If `symbol` is not specified, returns aggregated data.
- Response fields include: `symbolRnl`, `netExecQty`, `sumExecValue`, `sumExecQty`, `avgBuyExecPrice`, `sumBuyExecValue`, `sumBuyExecQty`, `sumBuyExecFee`, `sumBuyOrderQty`, `avgSellExecPrice`, `sumSellExecValue`, `sumSellExecQty`, `sumSellExecFee`, `sumSellOrderQty`, `maxMarginVersion`, `baseCoin`, `settleCoin`.

### Portfolio Margin (`/v5/asset/portfolio-margin`)
- Returns portfolio margin information including wallet balance, margin rates, and asset PNL range.
- If `baseCoin` is not specified, returns all base coins.
- Response wallet fields include: `equity`, `cashBalance`, `marginBalance`, `availableBalance`, `totalRPL`, `totalSessionRPL`, `totalSessionUPL`, `accountIM`, `accountMM`, `experienceBalance`, `perpUPL`, `accountMMRate`, `accountIMRate`.

### Total Members Assets (`/v5/asset/total-members-assets`)
- Returns aggregated total assets overview for parent and sub accounts.
- If `coin` is specified, total assets are denominated in that coin.
- Supports parent-sub account query; if `parentUid` exists, uses the parent account UID.

### Manual Repay (`/v5/account/repay`)
- New optional parameter `repaymentType`: `ALL` | `FIXED` | `FLEXIBLE` (default `FLEXIBLE`).
  - `ALL`: Repay all liabilities (both fixed-rate and flexible-rate)
  - `FIXED`: Repay fixed-rate liabilities only
  - `FLEXIBLE`: Repay flexible-rate (variable-rate) liabilities only
- When neither `coin` nor `amount` is provided, `repaymentType` must be `ALL`.

### No-Convert Repay (`/v5/account/no-convert-repay`)
- New optional parameter `repaymentType`: `ALL` | `FIXED` | `FLEXIBLE` (default `FLEXIBLE`).
  - `ALL`: Repay all liabilities (both fixed-rate and flexible-rate)
  - `FIXED`: Repay fixed-rate liabilities only
  - `FLEXIBLE`: Repay flexible-rate (variable-rate) liabilities only
- When neither `coin` nor `amount` is provided, `repaymentType` must be `ALL`.

### Quick Repay (`/v5/account/quick-repayment`)
- Error code `182120`: Please use the repay and no-convert-repay API instead.

### Fixed-Rate Borrow (`/v5/spot-margin-trade/fixedborrow`)
- Creates a fixed-rate borrow order. Unified account only.
- `orderCurrency`: Coin name (e.g. `USDT`, `BTC`). `orderAmount`: Borrow amount. `annualRate`: Max acceptable annual rate (e.g. `0.02`).
- `term`: `7` | `14` | `30` | `90` | `180` (days).
- `repayType`: `1` (auto-repay at maturity) | `2` (convert to flexible-rate loan at maturity).
- `strategyType`: `PARTIAL` (partial fill allowed) | `FULL` (fill or kill).

### Renew Fixed-Rate Borrow (`/v5/spot-margin-trade/fixedborrow-renew`)
- Renews (extends) an existing fixed-rate borrow contract.
- `loanId` (required): The contract ID to renew. `qty` (optional): Renewal amount; if omitted, uses full prepayment amount.

### Query Fixed-Rate Borrow Market (`/v5/spot-margin-trade/fixedborrow-order-quote`)
- Queries the fixed-rate lending supply order book.
- `orderCurrency` (required): Coin name. `orderBy` (required): `apy` | `term` | `quantity`.
- `sort`: `0` (ascending, default) | `1` (descending). `limit`: 1–100, default `10`.

### Query Fixed-Rate Borrow Orders (`/v5/spot-margin-trade/fixedborrow-order-info`)
- Queries fixed-rate borrow order history.
- `state`: `1` (matching) | `2` (partially filled & cancelled) | `3` (fully filled) | `4` (cancelled).
- Supports cursor-based pagination. `limit`: 1–100, default `10`.

### Query Fixed-Rate Borrow Contracts (`/v5/spot-margin-trade/fixedborrow-contract-info`)
- Queries matched fixed-rate loan contract details including principal, interest, and status.
- Supports cursor-based pagination. `limit`: 1–100, default `10`.

### Query Borrow Liability (`/v5/spot-margin-trade/liability`)
- Returns borrow liability breakdown: total, fixed-rate, flexible-rate, spot, and derivatives borrow amounts.
- `currency` (required): Coin name (e.g. `USDT`). Unified account only.

### Query Fixed-Rate Available Inventory (`/v5/spot-margin-trade/fixed-available-inventory`)
- Queries available inventory for fixed-rate borrowing by (`currency`, `term`, `annualRate`). Unified account only.
- `currency` (required): Uppercase coin name (e.g. `USDT`, `BTC`). Only coins supported by pledge (fixed-rate) borrowing are allowed.
- `term` (required): Loan term in days: `7` | `14` | `30` | `90` | `180`.
- `annualRate` (required): Annual interest rate (e.g. `0.02` = 2%).
- Available inventory = min(market supply + finance trial (50M), UTA user remaining borrow limit). Precision: borrow precision, rounded down.
- Response fields: `currency`, `term`, `annualRate`, `availableInventory`, `updateTime` (Unix seconds).
- Error codes: `34022001` system error, `34022008` invalid parameters / blank currency, `34022039` unsupported business type.

### Wallet Balance (`/v5/account/wallet-balance`)
- Response coin-level field `colRes` (platform-level collateral restriction): `-1` not applicable, `0` normal, `1` restricted (reaching platform limit), `2` fully restricted (at platform limit).
- Error `182011` on Set Collateral Switch: "The {coins} collateral amount has reached the platform limit."

### Affiliate User Info (`/v5/user/aff-customer-info`)
- `business` filter: `1` Derivatives, `2` Spot, `3` ByFi, `4` USDC, `5` Options.
- Response includes 30-day and 365-day volumes, deposit amounts, VIP level, KYC level, TradFi volume, and commission breakdown by coin.

### Affiliate Sub List (`/v5/affiliate/affiliate-sub-list`)
- Query sub-affiliates with optional commission date range (`startDate`/`endDate` in YYYY-MM-DD format).
- `size`: 0–100 (0 = all, up to 100). Rate limit: 10 req/s. Requires Master UID with affiliate permission.

### Set Margin Mode (`/v5/account/set-margin-mode`)
- Error code `3200425`: Cannot switch to Portfolio Margin (PM) mode while holding an Event Futures position. Close the position before switching.

### API Key Permissions
- 14 permission categories: ContractTrade, Spot, Wallet, Options, Derivatives, CopyTrading, BlockTrade, Exchange, NFT, Affiliate, Earn, FiatP2P, FiatBitPay, FiatConvertBroker.
- Read-Write API keys cannot add or delete FiatP2P, FiatBitPay, and FiatConvertBroker permissions.

## Enums

* **accountType**: `UNIFIED` | `FUND` | `SPOT` | `CONTRACT` | `INVESTMENT` | `OPTION`
* **collateralSwitch**: `ON` | `OFF`
* **frozen** (sub account): `0` (unfreeze) | `1` (freeze)
* **memberType** (sub account): `1` (normal) | `6` (custodial)
* **repaymentType**: `ALL` | `FIXED` | `FLEXIBLE` (default `FLEXIBLE`)
