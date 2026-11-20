# Module: Spot-X Activities (Launchpool, Puzzle, Token Splash)

> This module is loaded on-demand by the Bybit Trading Skill.

Spot-X campaign activities: **Launchpool** (stake coins to earn new-token rewards), **Puzzle**, and **Token Splash** (deposit / trade tasks for rewards). Project-list endpoints and Puzzle project detail are public (no authentication); authentication optionally adds registration-time information to Puzzle detail, while user-specific endpoints require API key authentication. All endpoints here are **read-only queries** — this module browses activities and reports a user's participation; it does not register, stake, or redeem.

## API Reference

### Launchpool (`/v5/spot-x/launchpool/`)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Project List | `/v5/spot-x/launchpool/project/list` | GET | status | activityCoin, projectId, cursor, limit | — |
| User Current Staking | `/v5/spot-x/launchpool/user/current-staking` | GET | — | — | — |
| User Activity Log | `/v5/spot-x/launchpool/user/activity-log` | POST | — | stakeCoin, type, status, startTime, endTime, pageSize, current | — |
| User History | `/v5/spot-x/launchpool/user/history` | POST | — | stakeCoin, rewardCoin, startTime, endTime, pageSize, current | — |

### Puzzle (`/v5/spot-x/puzzle/`)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Project List | `/v5/spot-x/puzzle/project/list` | GET | status | projectId, activityCoin, cursor, limit | — |
| Project Detail | `/v5/spot-x/puzzle/project/detail` | GET | projectCode | — | — |

### Token Splash (`/v5/spot-x/token-splash/`)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Project List | `/v5/spot-x/token-splash/project/list` | GET | status | projectId, activityCoin, cursor, limit | — |
| User Activity Params | `/v5/spot-x/token-splash/user/activity-params` | GET | — | projectId, activityCoin | — |

## Endpoint Notes

### Authentication
- **Public (no auth)**: all three `project/list` endpoints.
- **Public with optional authentication**: `puzzle/project/detail`. Anonymous responses have `isNewUser=null` and `newUserBenefitRecord=null`; do not require login merely to browse its public rules.
- **API key required**: `launchpool/user/*` and `token-splash/user/activity-params` (user identity injected by the gateway).

### Project List endpoints (Launchpool / Puzzle / Token Splash)
- `status` is **required**: `0` Upcoming, `1` Ongoing, `2` Ended. Results sorted newest-first.
- Cursor-based pagination: pass the previous response's `nextPageCursor` as `cursor`. Empty-string `nextPageCursor` means last page. `limit` default `10`, max `10`.
- Only online/released main-site public activities are returned.
- Launchpool items include a `pools[]` array (per-pool `stakeCoin`, `apr`, `totalStakedAmount`, `participantCount`).
- Token Splash: `registrationStartTime` = min(non-zero `signUpBeginTime`, `tradeSignUpBeginTime`); `activityEndTime` = max(`announceTime`, `tradeAnnounceTime`).

### Puzzle Project Detail (`/v5/spot-x/puzzle/project/detail`)

- Pass the activity's unique code as **`projectCode`**, not the list endpoint's `projectId` filter. Missing, blank, or longer-than-64-character codes return `10001`. Matching is case-insensitive; leading/trailing whitespace is not trimmed. There are no other documented query parameters.
- The query returns approved, visible main-site activities, regardless of the requester's source site or whether the activity is ongoing. Check `startTime`/`endTime` before describing an activity as active; these are millisecond timestamp **strings**, with separate UTC display strings. `awardEndTime` is a nullable integer millisecond reward-claim deadline.
- `result` is an activity-detail object on success and null on failure. It includes `projectCode`, `activityCoin`, `pcUrl`, reward configuration, task rules, `taskOrder`, and `displayRules`. `puzzleType`: `1` regular, `2` new-user activity; `isNewUserProject` describes activity type regardless of login.
- For authenticated requests, `isNewUser` only compares registration time with `newUserBeginTime` (false if that threshold is absent); it is not full participation eligibility. `newUserBenefitRecord` is one matching benefit record, may concern **another activity**, and is not sorted by creation time. Neither its presence nor `isNewUser=true` proves eligibility, task completion, or rewards available to claim.
- `hasLimit`: `0` no country/region restriction, `1` allowlist (`allowCountryI18nList`), `2` blocklist (`limitCountryI18nList`). These lists contain localized country/region names and are null outside their mode; they are not an eligibility verdict. `fragmentsPerDraw` is pieces needed per draw-chance exchange and `maxDrawExLimit` the configured exchange cap, not current chances or remaining exchanges.
- `displayRules[].canDisplay` describes per-task display permission for the source site (main site if absent), not task eligibility or existence. Disallowed entries remain in this list, and task rules are returned independently. An empty `displayRules` means no task-site configuration, not no tasks; use `taskOrder` only as display order.
- `totalReward` and `grandPrizePerAmount` are configured plain decimal strings with no currency conversion. Do not infer USD or their units from `grandPrizeToken`: that compatibility field contains the **activity token**. `bigPrizeToken` identifies the actual grand-prize reward currency; `prizeToken` is the prize display currency.
- Rule arrays include `signInRules`, `tradeRules`, `newUserTradeRules`, `depositRules`, `newUserDepositRules`, `referralRules`, `referralDepositRules`, `referralTradeRules`, `alphaRules`, `projectTaskRules`, `loanRules`, `convertRules`, `marginRules`, `onchainRules`, `referralOnchainTradeRules`, `newUserOnchainTradeRules`, `earnRules`, `botRules`, and `dcaRules`. Reward tier `rules` values are plain decimal thresholds, `awardPieces` the tier reward, and `ruleNum` the sequence. Sign-in tiers count days; trading/deposit tiers use configured task amounts; referral, referral-deposit, and referral-trade tiers count qualifying friends. `projectTaskRules` instead contains task `type`, PC `link`, and `appLink`, sorted by `ruleNum`, not reward thresholds or awarded pieces. All describe configuration, not personal progress.
- `signInLimit`, `depositLimit`, `tradeLimit`, `referralLimit`, `referralDepositLimit`, `referralTradeLimit`, `newUserDepositLimit`, `newUserTradeLimit`, and `projectTaskLimit` are configured task-specific piece caps, not pieces already earned or remaining. `signInDays` is the maximum sign-in day count. Legacy `signAmount` is a plain decimal **daily** sign-in trading threshold; for newer sign-in configuration use `signInTask.minimumTradeAmount` and `signInTask.piecesLimit`.
- Currency-scoped rules use `tokenType`: `0` specified currencies, `1` all currencies. `tokenList` may be empty when all currencies apply or none are configured; use `tokenType`, not list emptiness, to establish scope. Preserve configured identifiers, whitespace, and duplicates in `tradeTokenList`. `shareLimit` is a count of sharing occasions, not a piece amount. `newUserDepositThreshold`, `newUserTradeThreshold`, and `newOnchainTradeThreshold` apply to referred friends, not the new user's own task.
- `signInTask` can be null even when `signInRules` is nonempty if the new configuration is absent or unparseable. Its `signType` is a bitmask: `1` spot, `2` on-chain, `4` stocks, combinable; it differs from legacy `signTradeType` (`1` main site, `2` on-chain, `3` both). `spotScope`, `chainScope`, and `stockScope`: `0` specified, `1` all; consult the scope instead of inferring it from empty asset arrays. `signInTask.minimumTradeAmount` is a plain decimal **daily** trading threshold and `piecesLimit` the maximum pieces obtainable from this sign-in task.
- `stockConvertTask`, `stockTradeTask`, and `referralStockTradeTask` can be null without valid rules/configuration. Stock conversion task type is `22`; `direction`: `BOTH|STOCK_TO_MSTOCK|MSTOCK_TO_STOCK|null`. `tokenType`: `0` specified stocks, `1` all; a null `stockTokenList` alone does not establish scope. Stock trading uses `stockScope` (`0` specified, `1` all). `stockTradeTask.rules` thresholds are own traded amounts; `referralStockTradeTask.rules` thresholds count qualifying friends, and its `minimumTradeAmount` applies to the friend's trading, not the user's own task.
- Check `retCode` even for HTTP 200. Endpoint errors: `10001` invalid `projectCode`, `20001` activity not publicly available or task rules missing, `20013` authenticated user's registration information unavailable. A null field means unavailable/unconfigured, not zero, false, or completed. This endpoint does not join activities, complete tasks, exchange pieces, draw prizes, or claim rewards.

### Launchpool User Current Staking (`/v5/spot-x/launchpool/user/current-staking`)
- No parameters. Returns a USD portfolio summary (`totalInvestmentUsd`, `totalEarningsUsd`, `todayEarningsUsd`) plus up to **30** positions (no pagination). Each position: `stakeCoin`, `rewardCoin`, `stakeAmount`, `totalReward`, `autoRedeemDate`.

### Launchpool User Activity Log (`/v5/spot-x/launchpool/user/activity-log`)
- Page-based pagination: `current` (page, default `1`, max `100`) + `pageSize` (default `10`, max `10`).
- `startTime` and `endTime` must be provided **together** (both or neither), each a 13-digit ms timestamp string.
- `type` (operation type): `0` PLEDGE, `1` REDEEM, `2` INTEREST, `3` AUTO_REDEEM, `4` LOAN_PLEDGE, `5` LOAN_REDEEM, `6` LOAN_AUTO_REDEEM, `7` LOAN_RISKRATE_AUTO_REDEEM, `8` RISK_USER_AUTO_REDEEM, `9` LOAN_RISK_USER_AUTO_REDEEM, `10` EARN_REWARD.
- `status`: `0` Pending, `1` Success, `2` Failed.

### Launchpool User History (`/v5/spot-x/launchpool/user/history`)
- Returns completed (ended) staking positions, not individual transactions. Page-based pagination (`current` / `pageSize`, same limits as Activity Log).
- `startTime` / `endTime` filter by the **staking period** (`stakeBeginTime` / `stakeEndTime`), not record creation time; must be provided together as 13-digit ms timestamps.

### Token Splash User Activity Params (`/v5/spot-x/token-splash/user/activity-params`)
- Returns only activities the user has registered for, that are trade-task type, and that have not yet reached announcement time (rewards not yet distributed). Deposit-only tasks are excluded.
- In `tradeTask`, `tradeRequiredAmount` and `tradedAmount` are trade values measured in the stablecoin named by `tradeUnit` (for example, `500` and `300` USDT). `tradeToken` identifies the token counted by the task (for example, BTC); for an on-chain task it is the activity token ID, and otherwise it is the configured trade token. Do not interpret `tradeUnit` as the traded token.
- `tradeTask.estimatedRewardAmount` = `min(tradedAmount / tradeRequiredAmount, 1) × maxRewardAmount`, truncated to 4 decimals.

## Scenario: Inspect Puzzle Task Rules

User might say: "What are the rules for this Puzzle activity?", "Show the deposit and stock trading tasks."

Find an activity with the existing Puzzle project list (using its required `status`), then use its unique activity code:
```
GET /v5/spot-x/puzzle/project/detail?projectCode=<activity-code>
```
If no activity code is known, ask which activity or browse the list; do not substitute a numeric ID or invent a code. Browse anonymously unless authenticated registration-time information is needed. After `retCode=0`, report the activity dates, prize currencies, task thresholds and scopes, and source-site display settings, preserving unknown/null values. State that these are rules and configuration, not verified participation eligibility, personal progress, or claimable rewards.

## Enums

- **status** (project lists): `0` Upcoming | `1` Ongoing | `2` Ended
- **type** (Launchpool activity log): `0` PLEDGE | `1` REDEEM | `2` INTEREST | `3` AUTO_REDEEM | `4` LOAN_PLEDGE | `5` LOAN_REDEEM | `6` LOAN_AUTO_REDEEM | `7` LOAN_RISKRATE_AUTO_REDEEM | `8` RISK_USER_AUTO_REDEEM | `9` LOAN_RISK_USER_AUTO_REDEEM | `10` EARN_REWARD
- **status** (Launchpool activity log record): `0` Pending | `1` Success | `2` Failed

## Error Codes

- `10001` params error (invalid/missing parameters, e.g. bad `status`, only one of `startTime`/`endTime`, non-13-digit timestamp)
- `10003` system error
