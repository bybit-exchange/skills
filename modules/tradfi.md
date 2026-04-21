# Module: TradFi Integration

> This module is loaded on-demand by the Bybit Trading Skill. Authentication required for agreement signing; market queries are public.
>
> **Execution Constraints:** This module extends instrument discovery and agreement handling only. Order placement, confirmation flow, leverage, margin mode, and risk controls remain governed by the global rules in SKILL.md and the spot/derivatives modules. On Mainnet, all order and agreement operations MUST follow the Structured Operation Confirmation flow.

## Scenario: TradFi Trading (xStocks, Equity Perpetuals & Commodity Perpetuals)

User might say: "Trade Tesla on Bybit", "Buy AAPLXUSDT", "Open a gold perpetual", "Short crude oil", "List xStocks", "Show commodity perpetuals", "Sign the metals agreement", "What are the index components for XAUUSDT?", "Open a stock perpetual"

> **TradFi Integration** brings traditional-finance exposure into Bybit's unified account:
> - **xStocks** — tokenized equities traded as spot pairs (e.g., `TSLAXUSDT`, `AAPLXUSDT`, `NVDAXUSDT`)
> - **Equity Perpetuals** — USDT-margined linear perps tracking stock prices (e.g., `TSLAPUSDT`); discovered via `symbolType=stock`
> - **Commodity Perpetuals** — USDT-margined linear perps tracking metals and oil (e.g., `XAUUSDT`, `XAGUSDT`, `CLUSDT`)
>
> Trading uses the **standard V5 order endpoints** with the appropriate `category` and `symbol`. TradFi only introduces two things on top: (1) a one-time **agreement signing** for metals/oil/stock perps, and (2) `symbolType` filters for discovery.

---

## Workflow

```
1. Discover instruments → GET /v5/market/instruments-info  (with symbolType filter)
2. (Metals/Oil only) Sign agreement → POST /v5/user/agreement
3. Inspect index → GET /v5/market/index-price-components?indexName=<symbol>
4. Trade via standard V5 endpoints (/v5/order/create, /v5/order/cancel, ...)
```

> **MUST:** Call `/v5/market/instruments-info` to confirm the exact symbol before the first TradFi trade in a session. Do NOT infer symbols from common equity tickers (e.g., `TSLA` ≠ `TSLAXUSDT`). Only use symbols returned by the discovery endpoint.

---

## Disambiguation Rules

When users reference TradFi assets using natural language, follow these rules before placing any order:

1. **Equity names** (e.g., "buy Tesla", "买特斯拉") → Call `instruments-info` with `symbolType=xstocks` (spot) **and** `symbolType=stock` (linear) to discover both xStock tokens and equity perpetuals. Present all candidates and ask the user to pick the product type before proceeding.
2. **Commodity names** (e.g., "go long gold", "做多黄金") → Call `instruments-info` with `symbolType=commodity` to discover matching symbols. Default to the commodity perpetual (e.g., `XAUUSDT`). Present the resolved symbol for user confirmation before trading.
3. **Multiple matches or no results** → If discovery returns multiple candidates, list all and ask the user to pick one. If discovery returns zero results, inform the user that no matching TradFi instrument was found — do NOT guess or fabricate a symbol.

---

## Instrument Discovery

### List xStocks (tokenized equities, spot)

```
GET /v5/market/instruments-info?category=spot&symbolType=xstocks&limit=1000
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Y | `spot` |
| symbolType | string | Y | `xstocks` |
| symbol | string | N | Single symbol (e.g., `TSLAXUSDT`) |
| status | string | N | Filter by trading status |
| baseCoin | string | N | Base coin filter |
| limit | integer | N | Max 1000 |
| cursor | string | N | Pagination cursor (`nextPageCursor` from previous response) |

Examples returned: `TSLAXUSDT`, `AAPLXUSDT`, `NVDAXUSDT`.

> **xStocks-only response fields**: the instrument entry includes extra fields not present on regular spot pairs — notably `xstockMultiplier` (conversion ratio between the token and the underlying share). Surface this to the user when they ask about contract size / how many shares a token represents. Other xStocks-specific metadata fields may appear over time; pass them through as-is and do not assume they match standard spot schema.

### List Equity Perpetuals (stock perps, linear)

```
GET /v5/market/instruments-info?category=linear&symbolType=stock&limit=1000
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Y | `linear` |
| symbolType | string | Y | `stock` |
| symbol | string | N | Single symbol |
| status | string | N | Filter by trading status |
| baseCoin | string | N | Base coin filter |
| limit | integer | N | Max 1000 |
| cursor | string | N | Pagination cursor (`nextPageCursor` from previous response) |

> **Agreement required**: equity perpetuals require the same `category=2` / `categoryV2=1` agreement as precious metals.

### List Commodity Perpetuals (metals & oil, linear)

```
GET /v5/market/instruments-info?category=linear&symbolType=commodity&limit=1000
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Y | `linear` |
| symbolType | string | Y | `commodity` |
| symbol | string | N | Single symbol (e.g., `XAUUSDT`) |
| status | string | N | Filter by trading status |
| baseCoin | string | N | Base coin filter |
| limit | integer | N | Max 1000 |
| cursor | string | N | Pagination cursor (`nextPageCursor` from previous response) |

Examples returned: `XAUUSDT` (gold), `XAGUSDT` (silver), `CLUSDT` (crude oil).

---

## Agreement Signing (Metals & Oil)

Before trading **metals** or **crude oil** commodity perpetuals, the user must sign a one-time agreement. Without it, order placement will be rejected by the exchange.

```
POST /v5/user/agreement
{"categoryV2":1,"agree":true}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | integer | Y* | `2` Precious metals & equity perps; `3` Crude oil |
| categoryV2 | integer | Y* | `1` Precious metals & equity perps; `2` Crude oil. Preferred — new asset classes only added here |
| agree | boolean | Y | Must be `true` |

> **\*One of `category` or `categoryV2` must be provided.** Use `categoryV2` — `category` will not receive new enum values.

**Restrictions:**
- **Master account only** — subaccounts cannot call this. Once the master signs, all its subaccounts inherit eligibility.
- API key must carry **at least one** of: Account Transfer, Subaccount Transfer, or Withdrawal permission.
- xStocks **do not** require this agreement.

> Oil (CLUSDT) requires a separate call with `category=3` / `categoryV2=2`. Sign both if the user plans to trade both asset classes.

---

## Index Price Components

Commodity perpetuals are priced from an index composed of external reference contracts/sources. Use this when the user asks "what's the index made of" or to understand contract-roll pricing.

```
GET /v5/market/index-price-components?indexName=CLUSDT
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| indexName | string | Y | Commodity perpetual symbol (e.g., `XAUUSDT`, `CLUSDT`) |

> **xStocks note:** Index component details may not be available for tokenized equity symbols (e.g., `TSLAXUSDT`). If the endpoint returns no data or an error for an xStocks symbol, inform the user that index component details are not exposed for tokenized equities.

**Index Roll (commodity perps):** Underlying futures contracts roll periodically. During rollover, the index gradually re-weights from the current active contract to the next (e.g., CLUSDT transitions WTIK6 → WTIM6 over several days). Expect short-term reference-price drift during roll windows — inform the user if they ask why mark price diverges from a single reference.

---

## Trading (Standard V5 Endpoints)

TradFi instruments trade through the **existing** order endpoints. No TradFi-specific order API exists.

| Operation | Endpoint | Method | Category for xStocks | Category for Equity Perps | Category for Commodity |
|-----------|----------|--------|----------------------|---------------------------|------------------------|
| Place order | `/v5/order/create` | POST | `spot` | `linear` | `linear` |
| Amend order | `/v5/order/amend` | POST | `spot` | `linear` | `linear` |
| Cancel order | `/v5/order/cancel` | POST | `spot` | `linear` | `linear` |
| Cancel all | `/v5/order/cancel-all` | POST | `spot` | `linear` | `linear` |
| Open orders | `/v5/order/realtime` | GET | `spot` | `linear` | `linear` |
| Order history | `/v5/order/history` | GET | `spot` | `linear` | `linear` |
| Executions | `/v5/execution/list` | GET | `spot` | `linear` | `linear` |
| Batch place | `/v5/order/create-batch` | POST | `spot` | `linear` | `linear` |
| Batch amend | `/v5/order/amend-batch` | POST | `spot` | `linear` | `linear` |
| Batch cancel | `/v5/order/cancel-batch` | POST | `spot` | `linear` | `linear` |
| Spot borrow quota | `/v5/order/spot-borrow-check` | GET | `spot` | — | — |
| Pre-check order | `/v5/order/pre-check` | POST | `spot` | `linear` | `linear` |

**Examples**

Buy 0.1 Tesla xStock at market:
```
POST /v5/order/create
{"category":"spot","symbol":"TSLAXUSDT","side":"Buy","orderType":"Market","qty":"0.1"}
```

Buy 100 USDT worth of Tesla xStock at market (preferred — uses quoteCoin unit per SKILL.md rule 6):
```
POST /v5/order/create
{"category":"spot","symbol":"TSLAXUSDT","side":"Buy","orderType":"Market","qty":"100","marketUnit":"quoteCoin"}
```

Open a 10× long on gold:
```
POST /v5/order/create
{"category":"linear","symbol":"XAUUSDT","side":"Buy","orderType":"Market","qty":"1"}
```

> Leverage, position mode, risk limits and margin mode for commodity perpetuals are set through the normal derivatives endpoints (see `derivatives` module).

---

## Failure Handling

- **Agreement not signed (order rejected):** If a metals/oil order returns a permission-like error (e.g., `retCode=10005` or a TradFi-specific agreement error), automatically detect that the agreement has not been signed. Suggest the user sign via `POST /v5/user/agreement` with the appropriate category (`2` for metals, `3` for oil). Present this as a confirmation card on Mainnet.
- **Subaccount attempts to sign agreement:** If a subaccount calls `/v5/user/agreement` and the request fails, do NOT retry. Inform the user: "Agreement signing is restricted to the master account. Please sign the agreement from your master account — subaccounts will inherit eligibility automatically."
- **Symbol discovery fails or returns empty:** If `instruments-info` returns an error or zero results for the user's query, do NOT infer or fabricate a symbol. Inform the user that no matching TradFi instrument was found and suggest refining their query or checking available instruments.
- **`indexName` query returns no data:** If `index-price-components` returns no results or an error for a given symbol, return the exchange response directly and inform the user: "Index component details are not available for this symbol. This is expected for tokenized equities (xStocks) and some newer instruments."
- **Last-resort fallback (unresolved errors or missing info):** If none of the above rules resolve the issue — e.g., an unknown error code, an undocumented field, a behavior not covered by this module, or a user question about TradFi mechanics that this module doesn't answer — consult the official Bybit TradFi Integration docs at <https://bybit-exchange.github.io/docs/v5/tradfi-integration> before answering. Cite the URL when you do, so the user can verify. Never fabricate endpoints, parameters, or error-code meanings; if the docs don't cover it either, tell the user the information isn't documented and suggest they contact Bybit support.

---

## Notes

- **xStocks trade as spot** — no leverage, no funding rate, no expiry. They settle like any other spot pair.
- **Commodity perpetuals are linear USDT perps** — funding rate applies, leverage is configurable via `/v5/position/set-leverage`.
- **Agreement is a gate**: if a metals/oil order fails with a permission-like error and the user has never signed, call `/v5/user/agreement` first. Only the master account can sign.
- **Symbol naming**: xStock tickers end in `X` before the quote coin (e.g., `TSLAXUSDT`, not `TSLAUSDT`). See the MUST rule in the Workflow section for mandatory symbol confirmation.
- **Index components** help explain reference-price jumps during contract rolls — surface this when users ask about mark-price anomalies on commodity perps.
- Uses standard V5 response format (`retCode`/`retMsg`). Error codes are the standard trade-domain codes (see SKILL.md Error Handling section).
