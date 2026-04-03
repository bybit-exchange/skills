# Module: Fiat & P2P

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required for all endpoints.

---

## Fiat Convert (OTC)

Standard V5 authentication. Response: `{"retCode": 0, "retMsg": "...", "result": {...}}`.

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Balance | `/v5/fiat/balance-query` | GET | — | currency |
| Trading Pair List | `/v5/fiat/query-coin-list` | GET | — | side |
| Reference Price | `/v5/fiat/reference-price` | GET | symbol | — |
| Request Quote | `/v5/fiat/quote-apply` | POST | fromCoin, fromCoinType, toCoin, toCoinType, requestAmount | requestCoinType |
| Execute Trade | `/v5/fiat/trade-execute` | POST | quoteTxId, subUserId | webhookUrl, MerchantRequestId |
| Trade Status | `/v5/fiat/trade-query` | GET | — | tradeNo, merchantRequestId |
| Trade History | `/v5/fiat/query-trade-history` | GET | — | — |

### Scenario: Buy Crypto with Fiat

```
1. Check pairs       → GET  /v5/fiat/query-coin-list         — side=BUY
2. Get price          → GET  /v5/fiat/reference-price          — symbol (e.g. USDTEUR)
3. Request quote      → POST /v5/fiat/quote-apply              — get quoteTxId
4. Execute trade      → POST /v5/fiat/trade-execute            — use quoteTxId
5. Check status       → GET  /v5/fiat/trade-query              — poll until complete
```

---

## P2P Trading

**IMPORTANT: The P2P API is only accessible by General Advertisers or above.** Regular users cannot use these endpoints.

**P2P API conventions:**
- P2P responses use `ret_code` and `ret_msg` fields (with underscores): `{"ret_code": 0, "ret_msg": "SUCCESS", "result": {...}}`
- Most endpoints use **POST** with JSON body (even for queries)
- Uses standard V5 HMAC-SHA256 authentication (millisecond timestamps)

### Advertisement Management

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Get Ads | `/v5/p2p/item/online` | POST | tokenId, currencyId, side | page, size, paymentIds, amount |
| Post Ad | `/v5/p2p/item/create` | POST | tokenId, currencyId, side, priceType, price, minAmount, maxAmount, quantity, paymentPeriod, paymentIds, itemType | premium, remark, tradingPreferenceSet |
| Remove Ad | `/v5/p2p/item/cancel` | POST | itemId | — |
| Update / Relist Ad | `/v5/p2p/item/update` | POST | id, actionType | priceType, premium, price, minAmount, maxAmount, quantity, paymentPeriod, paymentIds, remark, tradingPreferenceSet |
| Get My Ads | `/v5/p2p/item/personal/list` | POST | — | page, size, tokenId, side, status |
| Get My Ad Details | `/v5/p2p/item/info` | POST | itemId | — |

#### Key Notes

* **side**: `0` = Buy, `1` = Sell
* **priceType**: `0` = Fixed price, `1` = Floating price (use `premium` for percentage)
* **actionType** (Update): `ACTIVE` = relist, `MODIFY` = update
* **paymentIds**: Array of payment method IDs from Get User Payment endpoint. Use `["-1"]` to keep existing.
* **tradingPreferenceSet**: Counterparty requirements (KYC, completion rate, registration time, etc.)
* **itemType**: `ORIGIN` (standard ad)
* Ad update limit: max 10 modifications per 5 minutes per ad

### Order Management

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Get All Orders | `/v5/p2p/order/simplifyList` | POST | — | page, size, side, status, startDate, endDate |
| Get Order Detail | `/v5/p2p/order/info` | POST | orderId | — |
| Get Pending Orders | `/v5/p2p/order/pending/simplifyList` | POST | — | page, size |
| Mark Order as Paid | `/v5/p2p/order/pay` | POST | orderId, paymentType, paymentId | — |

#### Key Notes

* **Mark Order as Paid**: "Balance" payment method is NOT supported via API.
* Orders default to 90 days, accessible up to 180 days.

#### Order Status Values

| Status Code | Meaning |
|------------|---------|
| 10 | Pending payment |
| 20 | Paid (waiting release) |
| 30 | Released |
| 40 | Appealing |
| 50 | Cancelled |
| 60 | Cancelled (system) |
| 70 | Completed |

### Chat

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Send Chat Message | `/v5/p2p/order/message/send` | POST | message, contentType, orderId, msgUuid | — |
| Upload Chat File | `/v5/p2p/oss/upload_file` | POST | upload_file (multipart/form-data) | — |
| Get Chat Messages | `/v5/p2p/order/message/listpage` | POST | orderId | size, lastMsgId |

#### Key Notes

* **contentType**: `str` (text), `pic` (image), `pdf`, `video`
* **Upload workflow**: Upload file first → get URL → send message with URL as `message` and correct `contentType`
* Supported file types: jpg, png, jpeg, pdf, mp4
* **msgUuid**: Client-side unique ID for deduplication

### User Information

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Get Account Info | `/v5/p2p/user/personal/info` | POST | — (empty body `{}`) | — |
| Get Counterparty User Info | `/v5/p2p/user/order/personal/info` | POST | originalUid, orderId | — |
| Get User Payment | `/v5/p2p/user/payment/list` | POST | — (empty body `{}`) | — |

#### Key Notes

* **Get User Payment** returns your configured payment methods. The `id` field is used as `paymentIds` when posting or updating ads.
* **Get Account Info** returns your P2P profile: nickname, KYC level, completion rate, VIP level, etc.

### P2P Scenarios

#### Post a Sell Ad

```
1. Get Payment Methods    → POST /v5/p2p/user/payment/list    — get paymentIds
2. Post Ad                → POST /v5/p2p/item/create           — side="1" (sell), paymentIds from step 1
3. Check My Ads           → POST /v5/p2p/item/personal/list    — verify ad is live
```

#### Complete a Buy Order (as buyer)

```
1. Browse Ads             → POST /v5/p2p/item/online           — side="0" (buy ads)
2. (Order created via platform UI or buyer API)
3. Mark as Paid           → POST /v5/p2p/order/pay             — after transferring fiat
4. Wait for Release       → POST /v5/p2p/order/info            — poll until status=70 (completed)
```

#### Complete a Sell Order (as seller)

```
1. Check Pending Orders   → POST /v5/p2p/order/pending/simplifyList
2. Verify Payment         → (check via your bank/payment method)
3. Release Assets         → (must be done manually on Bybit platform — not available via API for safety)
```
