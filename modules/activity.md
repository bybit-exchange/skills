# Module: Spot-X Activities (Launchpool, Puzzle, Token Splash)

> This module is loaded on-demand by the Bybit Trading Skill.

Spot-X campaign activities: **Launchpool** (stake coins to earn new-token rewards), **Puzzle**, and **Token Splash** (deposit / trade tasks for rewards). Project-list endpoints are public (no authentication); user-specific endpoints require API key authentication. All endpoints here are **read-only queries** — this module browses activities and reports a user's participation; it does not register, stake, or redeem.

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

### Token Splash (`/v5/spot-x/token-splash/`)

| Endpoint | Path | Method | Required Params | Optional Params | Categories |
|----------|------|--------|----------------|-----------------|------------|
| Project List | `/v5/spot-x/token-splash/project/list` | GET | status | projectId, activityCoin, cursor, limit | — |
| User Activity Params | `/v5/spot-x/token-splash/user/activity-params` | GET | — | projectId, activityCoin | — |

## Endpoint Notes

### Authentication
- **Public (no auth)**: all three `project/list` endpoints.
- **API key required**: `launchpool/user/*` and `token-splash/user/activity-params` (user identity injected by the gateway).

### Project List endpoints (Launchpool / Puzzle / Token Splash)
- `status` is **required**: `0` Upcoming, `1` Ongoing, `2` Ended. Results sorted newest-first.
- Cursor-based pagination: pass the previous response's `nextPageCursor` as `cursor`. Empty-string `nextPageCursor` means last page. `limit` default `10`, max `10`.
- Only online/released main-site public activities are returned.
- Launchpool items include a `pools[]` array (per-pool `stakeCoin`, `apr`, `totalStakedAmount`, `participantCount`).
- Token Splash: `registrationStartTime` = min(non-zero `signUpBeginTime`, `tradeSignUpBeginTime`); `activityEndTime` = max(`announceTime`, `tradeAnnounceTime`).

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
- `tradeTask.estimatedRewardAmount` = `min(tradedAmount / tradeRequiredAmount, 1) × maxRewardAmount`, truncated to 4 decimals.

## Enums

- **status** (project lists): `0` Upcoming | `1` Ongoing | `2` Ended
- **type** (Launchpool activity log): `0` PLEDGE | `1` REDEEM | `2` INTEREST | `3` AUTO_REDEEM | `4` LOAN_PLEDGE | `5` LOAN_REDEEM | `6` LOAN_AUTO_REDEEM | `7` LOAN_RISKRATE_AUTO_REDEEM | `8` RISK_USER_AUTO_REDEEM | `9` LOAN_RISK_USER_AUTO_REDEEM | `10` EARN_REWARD
- **status** (Launchpool activity log record): `0` Pending | `1` Success | `2` Failed

## Error Codes

- `10001` params error (invalid/missing parameters, e.g. bad `status`, only one of `startTime`/`endTime`, non-13-digit timestamp)
- `10003` system error
