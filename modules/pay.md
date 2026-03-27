# Module: BybitPay

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required for all endpoints.

**IMPORTANT — BybitPay uses different conventions from the standard V5 API:**

| Convention | BybitPay (Scan/Refund/Payout) | Agreement Payment | Standard V5 |
|-----------|-------------------------------|-------------------|-------------|
| Success code | `retCode=100000` | `"code": "SUCCESS"` | `retCode=0` |
| Timestamp precision | **Second** (`date +%s`) | ISO8601 strings | Millisecond |
| Extra header | `Version: 5.00` | — | — |
| Response format | `{"retCode", "retMsg", "result"}` | `{"code", "message", "data"}` | `{"retCode", "retMsg", "result"}` |

Signing uses the same HMAC-SHA256 method as standard V5, but timestamp in headers must be **second precision** for BybitPay endpoints (not milliseconds).

---

## Scan Payment

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Payment Creation | `/v5/bybitpay/create_pay` | POST | merchantId, paymentType, merchantTradeNo, orderAmount, currency, currencyType, successUrl, failedUrl, webhookUrl, customer, goods, env | merchantName, orderExpireTime, quotationId |
| Payment Result | `/v5/bybitpay/pay_result` | GET | merchantId, paymentType | clientId, merchantTradeNo, payId (one of merchantTradeNo/payId required) |
| Payment Status Mock | `/v5/bybitpay/paystatus/mock` | POST | paymentType, merchantId, status | clientId, merchantTradeNo, payId (one of merchantTradeNo/payId required) |
| Payment FX Convert | `/v5/bybitpay/fx/convert` | POST | merchantId, paymentType, orderAmount, orderCurrency, orderCurrencyType, settleCurrency, settleCurrencyType | merchantName |
| Order Refund | `/v5/bybitpay/refund` | POST | merchantId, list[].refundType, list[].merchantRefundNo, list[].refundAmount | list[].merchantTradeNo, list[].payId (one required), list[].env |

### Key Notes

* **Payment Creation** returns `qrContent` (QR code image) and `checkoutLink` (redirect URL). Use `qrContent` for WEB/OTHERS terminals, `checkoutLink` for APP/WAP/MINIAPP.
* **FX Convert** returns a `quotationId` — pass it to Payment Creation to lock the exchange rate.
* **Payment Status Mock** is **Sandbox (Testnet) only** — simulate `PAY_SUCCESS` or `REFUND_SUCCESS` for testing.
* **Order Refund** supports batch refund (multiple items in `list[]`). Supports partial and full refund. `refundType`: `MERCHNT_SELF_REFUND` (funds from merchant's KYB funding account).
### Payment Status Values

`INIT` → `PAY_SUCCESS` / `PAY_FAIL` / `TIMEOUT`

### paymentType Values

| Value | Usage |
|-------|-------|
| `E_COMMERCE` | Standard payment |
| `E_COMMERCE_REFUND` | Query refund order (in pay_result) |

---

## Agreement Payment (Recurring)

Agreement Payment uses a **different response format**: `{"code": "SUCCESS", "message": "...", "data": {...}}`.
Webhook signature headers: `X-Signature` / `X-Timestamp` / `X-Nonce` / `X-Sign-Type`.

| Endpoint | Path | Method | Required Params | Optional Params |
|----------|------|--------|----------------|-----------------|
| Sign Request | `/v5/bybitpay/agreement/sign` | POST | merchant_id, user_id, agreement_type, merchant_user_id, scene_code, external_agreement_no, single_limit, notify_url | product_code, sign_valid_time, period_limits, return_url, sign_expire_minutes |
| Unsign | `/v5/bybitpay/agreement/unsign` | POST | merchant_id, user_id, agreement_type, unsign_type | agreement_no, external_agreement_no (one required), unsign_reason |
| Agreement Deduction | `/v5/bybitpay/agreement/pay` | POST | merchant_id, user_id, agreement_type, agreement_no, out_trade_no, scene_code, amount, notify_url | order_info |
| Pay with Sign | `/v5/bybitpay/agreement/pay-with-sign` | POST | merchant_id, user_id, agreement_type, pay_params | sign_params (required for first-time sign+pay) |
| Sign Status Query | `/v5/bybitpay/agreement/query` | GET | merchant_id, user_id, agreement_type | agreement_no, external_agreement_no (one required) |
| Agreement List | `/v5/bybitpay/agreement/list` | GET | merchant_id | user_id, agreement_type, status, scene_code, start_time, end_time, page_no, page_size |
| Transaction Query | `/v5/bybitpay/agreement/pay/query` | GET | merchant_id, user_id, agreement_type | record_type (`PAY`/`REFUND`), trade_no, out_trade_no, refund_no, out_refund_no |
| Transaction List | `/v5/bybitpay/agreement/pay/list` | GET | merchant_id, user_id, agreement_type, agreement_no | record_type, status, start_time, end_time, page_no, page_size |
| Deduction Refund | `/v5/bybitpay/agreement/refund` | POST | merchant_id, user_id, agreement_type, refund_amount, notify_url | trade_no, out_trade_no (one required), out_refund_no, refund_reason |

### Key Notes

* **Sign Request** returns `sign_url` (redirect for H5/Web) and `qr_code_url` (QR image for App scan). After user signs, Bybit sends `AGREEMENT_STATUS` webhook.
* **Agreement Deduction** is a silent deduction — no user interaction needed. Final result comes via `TRANSACTION_RESULT` webhook.
* **Pay with Sign** combines signing + deduction in one call. Two modes: pass `sign_params` for first-time sign+pay, or omit it and pass `pay_params.agreement_no` for pay-only.
* **agreement_type**: `CYCLE` (recurring deduction).
* **amount** object: `{total, currency, currency_type, chain}`. `currency_type`: `CRYPTO` or `FIAT`.

### Agreement Status Values

`INIT` → `SIGNED` → `UNSIGNED` (or `EXPIRED`)

### Transaction Status Values

`PROCESSING` → `SUCCESS` / `FAILED`

---

## Scenarios

### Scenario 1: Accept a One-Time Payment

```
1. (Optional) FX Convert   → POST /v5/bybitpay/fx/convert     — lock exchange rate
2. Create Payment           → POST /v5/bybitpay/create_pay     — get QR code / checkout link
3. Show QR or redirect user to checkout link
4. Query Result             → GET  /v5/bybitpay/pay_result     — poll until PAY_SUCCESS/PAY_FAIL/TIMEOUT
```

### Scenario 2: Set Up Recurring Subscription

```
1. Sign Agreement          → POST /v5/bybitpay/agreement/sign        — get sign URL / QR
2. User scans and signs    → (webhook: AGREEMENT_STATUS)
3. Silent Deduction        → POST /v5/bybitpay/agreement/pay         — deduct funds
4. Query Transaction       → GET  /v5/bybitpay/agreement/pay/query   — check result
5. (Optional) Refund       → POST /v5/bybitpay/agreement/refund
```

### Scenario 3: Sandbox Testing

```
1. Create Payment          → POST /v5/bybitpay/create_pay
2. Mock Status             → POST /v5/bybitpay/paystatus/mock  (Testnet only, simulate PAY_SUCCESS)
3. Query Result            → GET  /v5/bybitpay/pay_result
```

---

## curl Example — Create Payment

```bash
TIMESTAMP=$(date +%s)   # NOTE: second precision, NOT milliseconds
BODY='{"merchantId":"305142568","paymentType":"E_COMMERCE","merchantTradeNo":"'"$(uuidgen)"'","orderAmount":"10","currency":"USDT","currencyType":"crypto","successUrl":"https://example.com/success","failedUrl":"https://example.com/failed","webhookUrl":"https://example.com/webhook","customer":{"externalUserId":"test@example.com"},"goods":[{"goodsName":"Test"}],"env":{"terminalType":"WEB"}}'
PARAM_STR="${TIMESTAMP}${API_KEY}${RECV_WINDOW}${BODY}"
SIGN=$(echo -n "$PARAM_STR" | openssl dgst -sha256 -hmac "${SECRET_KEY}" | cut -d' ' -f2)

curl -s -X POST "${BASE_URL}/v5/bybitpay/create_pay" \
  -H "Content-Type: application/json" \
  -H "X-BAPI-API-KEY: ${API_KEY}" \
  -H "X-BAPI-TIMESTAMP: ${TIMESTAMP}" \
  -H "X-BAPI-SIGN: ${SIGN}" \
  -H "X-BAPI-RECV-WINDOW: ${RECV_WINDOW}" \
  -H "Version: 5.00" \
  -H "User-Agent: bybit-skill/1.2.0" \
  -H "X-Referer: bybit-skill" \
  -d "$BODY"
```

**Remember:** BybitPay success = `retCode: 100000`, not `0`.
