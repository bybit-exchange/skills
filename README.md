# Bybit Exchange Trading Skill

Trade on Bybit using natural language. Tell any AI assistant one sentence, and it can execute trades, check markets, manage positions, and more — zero installation required.

**Version:** 1.2.5 | **License:** MIT

**Provenance:** This is a community-maintained skill package for the Bybit API. Unless the ClawHub registry entry shows a verified Bybit publisher or trusted source repository, do not treat this package as official Bybit software.

## How It Works

Install this skill through your AI platform's skill manager (e.g., OpenClaw Cloud Hub). Once installed, the skill loads its modules from local files. Runtime market, account, and trading operations call Bybit API endpoints. The skill does not download additional modules or code at runtime.

## Supported AI Platforms

Works with any AI assistant that can read files or URLs:

- OpenClaw
- Claude (Code, Desktop, API)
- ChatGPT
- Gemini
- Cursor / Windsurf
- Codex

## Capabilities

| Module | What Users Can Do |
|--------|-------------------|
| **Market** | Real-time prices, klines (13 intervals), orderbook (500 levels), funding rates, open interest, volatility |
| **Spot** | Market/limit orders, batch orders (20/batch), cancel, amend, spot margin |
| **Derivatives** | Long/short, leverage, TP/SL, trailing stop, conditional orders, hedge mode, margin adjustment |
| **Earn** | Flexible saving, on-chain staking, dual assets (structured products with BuyLow/SellHigh) |
| **Account** | Balances, internal transfers, deposit addresses, fee rates, sub-accounts, asset conversion |
| **Advanced** | WebSocket streams, crypto loans, RFQ block trades, spread trading, broker management |
| **Strategy** | TWAP, iceberg orders, chase orders, algorithmic execution |
| **Trading Bot** | Spot/futures grid bots, DCA bots, martingale, combo bots |
| **Copy Trading** | Follow top traders, classic and TradFi copy trading |
| **Alpha Trade** | On-chain DEX token swaps, meme coins, quote-then-execute model |
| **Pay** | QR payments, refunds, recurring agreement billing |
| **Fiat** | Fiat-to-crypto OTC, P2P ads and order management |

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
export BYBIT_ENV="testnet"   # switch to "mainnet" only when ready for real funds
```

**OpenClaw** — use `.env` file:

```bash
# ~/.openclaw/.env
BYBIT_API_KEY=your_api_key
BYBIT_API_SECRET=your_secret_key
BYBIT_ENV=testnet
```

**Cloud AI / hosted platforms** — use your platform's secure environment variable or secret configuration. **Never paste API keys directly into the conversation.**

### 3. Start Trading

Just tell the AI what you want in natural language. The skill handles the rest.

## Security

| Feature | Description |
|---------|-------------|
| **Testnet by default** | Users start on testnet; switching to mainnet requires explicit confirmation |
| **Trade confirmation** | Every mainnet write operation shows a structured summary card — user must type CONFIRM |
| **Large order protection** | Orders exceeding 20% of balance or $10,000 trigger additional warnings |
| **API key masking** | Keys are displayed as first 5 + last 4 characters only |
| **Local HMAC signing** | Signatures are computed locally — secrets never leave the user's device |
| **Prompt injection defense** | API response text fields are displayed but never executed |
| **Graceful degradation** | If a module fails to load, write operations are disabled (read-only fallback) |
| **Rate limit protection** | Built-in 429 backoff and call interval rules |

## Updating

To get a newer version of the skill, reinstall it via your skill manager. Modules are loaded from local files only — the skill does **not** auto-download files from remote URLs at runtime.

## License

[MIT](LICENSE)
