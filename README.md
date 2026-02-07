# Polymarket Crypto 15m & 1h Trading Bot

Trading bot for Polymarket crypto 15-minute and hourly prediction markets. Built with Bun.

## Setup

1. Install [Bun](https://bun.sh): `curl -fsSL https://bun.sh/install | bash` (or `npm install -g bun` on Windows).
2. Copy `.env.example` to `.env` and set:
   - `PRIVATE_KEY` – Wallet private key (from [Polymarket](https://polymarket.com) or [reveal](https://reveal.magic.link/polymarket) if using email login).
   - `FUNDER_ADDRESS` – Polymarket profile/funder address (where you deposit USDC). Find at [polymarket.com/settings](https://polymarket.com/settings).
   - `SIGNATURE_TYPE` – `0` EOA, `1` Magic/email, `2` Gnosis Safe proxy (default).
3. Run: `bun install` then `bun run start` (or `bun run trade`).

## Env vars

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Required. Wallet private key. |
| `FUNDER_ADDRESS` | Required. Polymarket funder/profile address. |
| `SIGNATURE_TYPE` | Optional. 0=EOA, 1=Magic, 2=Gnosis Safe (default). |
| `CLOB_HOST` | Optional. Default `https://clob.polymarket.com`. |
| `GAMMA_HOST` | Optional. Default `https://gamma-api.polymarket.com`. |
| `CHAIN_ID` | Optional. Default `137` (Polygon). |
| `ORDER_SIZE_USD` | Optional. Order size in USD (default `5`). |
| `MIN_EDGE` | Optional. Min edge vs 0.5 to trade (default `0.02`). |
| `POLL_MS` | Optional. Poll interval in ms (default `10000`). |
| `RPC_URL` | Optional. Polygon RPC for redeem/approve (default `https://polygon-rpc.com`). |
| `DATA_API_HOST` | Optional. Data API for positions (default `https://data-api.polymarket.com`). |
| `APPROVE_ON_START` | Optional. Set USDC allowance for CTF when bot starts (default `true`). |
| `AUTO_REDEEM_INTERVAL_MS` | Optional. Run auto-redeem every N ms (default `300000`, 0=off). |

## Approve allowance

The bot sets USDC allowance for the CTF contract on startup when `APPROVE_ON_START=true` (via your proxy if `FUNDER_ADDRESS` is set). This allows splitting USDC into outcome tokens. You can also run approval manually:

**Programmatic:** `import { approveAllowanceAndWait } from "./src/approve";` then `await approveAllowanceAndWait()` (default: max allowance for CTF). Optional args: `(spender, amount, token, useProxy)`.

## Redeem

Redeem resolved conditional tokens (YES/NO shares) for USDC. Uses the CTF contract; if `FUNDER_ADDRESS` is set, the transaction is executed via your Polymarket proxy.

**CLI:** `bun run redeem <conditionId>`

Get `conditionId` from the market (e.g. Gamma API market `conditionId`). The market must be resolved and payouts reported.

**Programmatic:** `import { redeem, redeemAndWait } from "./src/redeem";` then `await redeem(conditionId)` or `await redeemAndWait(conditionId)`.

**Auto redeem:** The main bot (`bun run start`) periodically fetches redeemable positions from the Data API (using `FUNDER_ADDRESS`) and redeems each condition. Interval is set by `AUTO_REDEEM_INTERVAL_MS` (default 5 minutes). Negative-risk positions are skipped. To run a one-off batch: `import { autoRedeem } from "./src/redeem";` then `await autoRedeem(funderAddress)`.

## Why Bun for this project

Using Bun instead of Node or Python makes this bot faster and simpler to run.

### Speed

- **Startup**: Bun starts in single-digit milliseconds. Node often takes 50–200ms before your script runs; Python can be 100–500ms. For a bot that polls every few seconds, Bun’s quick startup and low overhead mean less delay and more predictable timing.
- **Runtime**: Bun’s runtime is implemented in Zig and uses JavaScriptCore. Execution of the hot path (fetching markets, calling CLOB/Gamma, computing signals, placing orders) is faster than Node (V8) in many workloads and much faster than CPython, so each poll cycle finishes sooner.
- **HTTP**: Bun’s built-in `fetch` and HTTP stack are optimized and avoid the cost of extra native modules. Compared to Node (where you often add `axios` or `node-fetch`) or Python (`requests`/`aiohttp`), you get lower latency per request, which matters when hitting Polymarket’s APIs every poll.

### Compared to Node

- **No separate `node-fetch`/`axios`**: Native `fetch` and top-level await keep the code small and fast.
- **Faster installs**: `bun install` is typically much faster than `npm install` or `yarn`, so iterating on dependencies is quicker.
- **Single runtime**: Run and install with one tool; no need to switch between Node versions for this project.
- **TypeScript by default**: No extra transpile step; Bun runs `.ts` directly, which speeds up development and avoids a build phase.

### Compared to Python

- **No GIL**: Python’s GIL can limit concurrency; Bun (and JS in general) doesn’t have that, so concurrent requests (e.g. multiple markets or endpoints) scale better.
- **Faster loops and math**: The strategy and rounding logic run in a fast engine; no interpreter overhead like in CPython.
- **Ecosystem fit**: Polymarket’s official CLOB client is TypeScript/JavaScript; using Bun keeps you on the same stack with no wrappers or reimplemented signing/API logic.
- **Deployment**: One binary-style story with Bun; no virtualenv or Python version matrix.

### Summary

For a polling-based Polymarket crypto bot, Bun gives you faster startup, faster HTTP and execution, and a simpler toolchain than Node or Python, which helps with latency and iteration speed.
