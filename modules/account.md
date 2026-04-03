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
| Manual Repay | `/v5/account/repay` | POST | — | coin, amount | — |
| No-Convert Repay | `/v5/account/no-convert-repay` | POST | coin | amount | — |
| Quick Repay | `/v5/account/quick-repayment` | POST | — | coin | — |
| Batch Set Collateral | `/v5/account/set-collateral-switch-batch` | POST | request[] | — | — |
| Set Spot Hedging | `/v5/account/set-hedging-mode` | POST | setHedgingMode | — | spot |
| Set Price Limit Action | `/v5/account/set-limit-px-action` | POST | category, modifyEnable | — | linear, inverse |
| Set Delta Neutral Mode | `/v5/account/set-delta-mode` | POST | deltaHedgeMode | — | option |
| Apply Demo Funds | `/v5/account/demo-apply-money` | POST | — | adjustType, utaDemoApplyMoney | — |
| Option Asset Info | `/v5/account/option-asset-info` | GET | — | — | option |
| Pay Info | `/v5/account/pay-info` | GET | — | coin | — |
| Trade Info For Analysis | `/v5/account/trade-info-for-analysis` | GET | — | symbol, startTime, endTime | — |

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

### User (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Sub-account List | `/v5/user/query-sub-members` | GET | — | — | — |
| API Key Info | `/v5/user/query-api` | GET | — | — | — |
| Member Type | `/v5/user/get-member-type` | GET | — | — | — |
| Affiliate User Info | `/v5/user/aff-customer-info` | GET | uid | — | — |
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

## Enums

* **accountType**: `UNIFIED` | `FUND` | `SPOT` | `CONTRACT` | `INVESTMENT` | `OPTION`
* **collateralSwitch**: `ON` | `OFF`
* **frozen** (sub account): `0` (unfreeze) | `1` (freeze)
* **memberType** (sub account): `1` (normal) | `6` (custodial)
