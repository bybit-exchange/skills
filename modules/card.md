# Module: Bybit Card

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required.

## Scenario: Bybit Card

User might say: "card transactions", "card spending history", "check my card payments", "query card records"

---

## API Reference

### Card (authentication required)

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Query Asset Records | `/v5/card/transaction/query-asset-records` | POST | — | statusCode, limit, page, pan4, createBeginTime, createEndTime, merchName, type, txnId, cardToken, orderNo |

## Endpoint Notes

### Query Asset Records (`/v5/card/transaction/query-asset-records`)

- `statusCode`: `0` Pending, `1` Cleared, `2` Declined
- `type`: `SIDE_QUERY_AUTH` (Authorization), `SIDE_QUERY_FINANCIAL` (Clearing), `SIDE_QUERY_REFUND` (Refund)
- `limit`: 1–500 (default `100`). `page`: min 1 (default `1`).
- `pan4`: last 2 or 4 digits of card number for filtering. `merchName` supports fuzzy search.
- Response `side` enum: `1` Authorization, `2` Auth Reversal, `3` Transaction, `4` Refund (unDeduct), `5` Refund, `6` Chargeback, `7` Transaction (Direct), `8` Refund Reversal, `9` Chargeback Reversal, `10` Refund Request, `11` Refund Reversal Request, `12` Chargeback Fee, `13` ATM Withdrawal
- Response `tradeStatus`: `0` In_Progress, `1` Completed, `2` Declined, `3` Reversal
