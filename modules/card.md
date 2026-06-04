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

**Request parameters:**

| Param | Type | Description |
|-------|------|-------------|
| statusCode | string | `0` Pending, `1` Cleared, `2` Declined |
| limit | integer | Items per page, 1–500 (default `100`) |
| page | integer | Page number, min 1 (default `1`) |
| pan4 | string | Last 2/4 digits of card number for filtering |
| createBeginTime | integer | Start time (Unix ms timestamp) |
| createEndTime | integer | End time (Unix ms timestamp) |
| merchName | string | Merchant name (fuzzy search) |
| type | string | `SIDE_QUERY_AUTH` (Authorization), `SIDE_QUERY_FINANCIAL` (Clearing), `SIDE_QUERY_REFUND` (Refund) |
| txnId | string | Transaction ID (exact match) |
| cardToken | string | Card token identifying a specific card |
| orderNo | string | Order number (exact match) |

**Status fields — 三个不同含义，不要混淆：**

| 字段 | 位置 | 含义 |
|------|------|------|
| `statusCode` | 请求参数 | 筛选条件：`0` Pending, `1` Cleared, `2` Declined |
| `tradeStatus` | 响应字段 | 交易进度：`0` In_Progress, `1` Completed, `2` Declined, `3` Reversal |
| `status` | 响应字段 | 订单状态：`-1` Init, `0` Pending, `1` Success, `2` Fail |

> `statusCode` 用于请求过滤，`tradeStatus` 反映交易在卡网络中的进度，`status` 反映 Bybit 系统内部的订单处理状态。两个响应字段可能同时出现在同一条记录中。

**Response display rules:**
- `uid`: **隐藏，不展示给用户** — 内部标识，存在身份关联风险
- `pan6`: **隐藏，不展示给用户** — 卡 BIN 号段暴露发卡行信息，用户辨认卡片仅需 `pan4`（尾号）

**Response `side` enum:** `1` Authorization, `2` Auth Reversal, `3` Transaction, `4` Refund (unDeduct), `5` Refund, `6` Chargeback, `7` Transaction (Direct), `8` Refund Reversal, `9` Chargeback Reversal, `10` Refund Request, `11` Refund Reversal Request, `12` Chargeback Fee, `13` ATM Withdrawal
