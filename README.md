# Bybit AI Trading Skill

Trade on Bybit using natural language. Tell any AI assistant one sentence, and it can execute trades, check markets, manage positions, and more — zero installation required.

**Version:** 1.0.0 | **License:** MIT | **Endpoints:** 253

## How It Works

Copy the following line and send it to your AI assistant:

```
Please read https://raw.githubusercontent.com/bybit-exchange/skills/main/SKILL.md, save it as a skill, and help me trade on Bybit.
```

The AI will download and install the skill automatically — then you can start trading in natural language. No npm packages, no CLI tools, no config files.

## Supported AI Platforms

Works with any AI assistant that can read files or URLs:

- OpenClaw
- Claude (Code, Desktop, API)
- ChatGPT
- Gemini
- Cursor / Windsurf
- Codex

## Architecture

```
SKILL.md                  # Main skill file (~8K tokens) — quick start, module router, fallback
├── modules/market.md     # Market data: prices, klines, orderbook, funding rates (24 endpoints)
├── modules/spot.md       # Spot trading: orders, margin (24 endpoints)
├── modules/derivatives.md # Futures & options: positions, leverage, TP/SL (19 endpoints)
├── modules/earn.md       # Savings & staking (6 endpoints)
├── modules/account.md    # Balances, transfers, sub-accounts, fees (74 endpoints)
├── modules/advanced.md   # WebSocket, loans, RFQ, block trade, broker (78 endpoints)
├── modules/pay.md        # Merchant payments, agreements (14 endpoints)
└── modules/fiat.md       # Fiat OTC, P2P trading (23 endpoints)
```

**Modular on-demand loading** — you only install `SKILL.md`. The AI fetches module files from GitHub at runtime as needed, keeping token usage minimal.

## Capabilities

| Module | What Users Can Do | Endpoints |
|--------|-------------------|-----------|
| **Market** | Real-time prices, klines (13 intervals), orderbook (500 levels), funding rates, open interest, volatility | 24 |
| **Spot** | Market/limit orders, batch orders (20/batch), cancel, amend, spot margin | 24 |
| **Derivatives** | Long/short, leverage, TP/SL, trailing stop, conditional orders, hedge mode, margin adjustment | 19 |
| **Earn** | Browse products, subscribe, redeem, check yield history | 6 |
| **Account** | Balances, internal transfers, deposit addresses, fee rates, sub-accounts, asset conversion | 74 |
| **Advanced** | WebSocket streams, crypto loans, RFQ block trades, spread trading, broker management | 78 |
| **Pay** | QR payments, refunds, recurring agreement billing | 14 |
| **Fiat** | Fiat-to-crypto OTC, P2P ads and order management | 23 |
| | **Total (deduplicated)** | **253** |

> Spot and Derivatives share 9 order-management endpoints (`/v5/order/*`). Each module lists them independently for completeness, but they are counted only once in the total.

## Quick Start

### 1. Get an API Key

1. Log in to [Bybit](https://www.bybit.com) → API Management → Create New Key
2. Enable **Read + Trade** permissions only (never enable Withdraw for AI use)
3. Recommended: bind your IP and use a dedicated sub-account with limited balance

### 2. Configure Credentials

**Local CLI** (Claude Code, Cursor, etc.):

```bash
export BYBIT_API_KEY="your_api_key"
export BYBIT_API_SECRET="your_secret_key"
export BYBIT_ENV="mainnet"   # or "testnet"
```

**OpenClaw** — use `.env` file:

```bash
# ~/.openclaw/.env
BYBIT_API_KEY=your_api_key
BYBIT_API_SECRET=your_secret_key
BYBIT_ENV=mainnet
```

**Cloud AI** (ChatGPT, Gemini) — the AI will ask for credentials interactively and keep them in memory for the session only.

### 3. Start Trading

Just tell the AI what you want in natural language. The skill handles the rest.

## Security

| Feature | Description |
|---------|-------------|
| **Mainnet by default** | Users start on mainnet with full trade confirmation; can switch to testnet for practice |
| **Trade confirmation** | Every mainnet write operation shows a structured summary card — user must type CONFIRM |
| **Large order protection** | Orders exceeding 20% of balance or $10,000 trigger additional warnings |
| **API key masking** | Keys are displayed as first 5 + last 4 characters only |
| **Local HMAC signing** | Signatures are computed locally — secrets never leave the user's device |
| **Prompt injection defense** | API response text fields are displayed but never executed |
| **Graceful degradation** | If a module fails to load, write operations are disabled (read-only fallback) |
| **Rate limit protection** | Built-in 429 backoff and call interval rules |

## Auto Update

The skill includes a self-update mechanism. At session start, it checks the `VERSION` file on GitHub. If a newer version is available, it downloads updated files listed in `MANIFEST` — keeping users on the latest version automatically.

## License

[MIT](LICENSE)
