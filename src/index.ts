import { config } from "./config";
import { fetchCryptoMarkets, parseClobTokenIds } from "./api/gamma";
import { createClobClient, ensureApiCreds } from "./api/clob";
import { computeSignal, roundToTick } from "./strategy";
import { approveAllowanceAndWait } from "./approve";
import { autoRedeem } from "./redeem";
import { OrderType, Side, type TickSize } from "@polymarket/clob-client";

const CLOB = config.clobHost;
let lastAutoRedeemTs = 0;

async function getMidpoint(tokenId: string): Promise<number | null> {
  try {
    const r = await fetch(`${CLOB}/midpoint?token_id=${tokenId}`);
    if (!r.ok) return null;
    const j = await r.json() as { mid?: number; price?: number };
    const p = j.mid ?? j.price;
    return typeof p === "number" && Number.isFinite(p) ? p : null;
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  if (!config.privateKey || !config.funderAddress) {
    console.error("Set PRIVATE_KEY and FUNDER_ADDRESS in .env");
    process.exit(1);
  }
  if (config.approveOnStart) {
    try {
      await approveAllowanceAndWait();
      console.log("USDC allowance for CTF set");
    } catch (e) {
      console.warn("Approve on start failed:", String(e));
    }
  }
  const client = createClobClient(null);
  const creds = await ensureApiCreds(client);
  const tradingClient = createClobClient(creds);
  const sizeUsd = config.orderSizeUsd;

  for (;;) {
    try {
      const rows = await fetchCryptoMarkets();
      for (const { seriesSlug, event, market } of rows) {
        const tokens = parseClobTokenIds(market.clobTokenIds);
        if (!tokens) continue;
        const tickSize = String(market.orderPriceMinTickSize ?? "0.01");
        const minSize = Number(market.orderMinSize) || 1;
        const priceYes = await getMidpoint(tokens.yes);
        const priceNo = await getMidpoint(tokens.no);
        if (priceYes === null) continue;
        const priceNoVal = priceNo ?? 1 - priceYes;
        const signal = computeSignal(
          tokens.yes,
          tokens.no,
          priceYes,
          priceNoVal,
          tickSize,
          minSize,
          sizeUsd
        );
        if (!signal) continue;
        const priceRounded = roundToTick(signal.price, tickSize);
        const side = signal.side === "BUY" ? Side.BUY : Side.SELL;
        try {
          const resp = await tradingClient.createAndPostOrder(
            {
              tokenID: signal.tokenId,
              price: priceRounded,
              side,
              size: signal.size,
            },
            { tickSize: tickSize as TickSize, negRisk: false },
            OrderType.GTC
          );
          console.log(seriesSlug, event.slug ?? event.id, signal.side, priceRounded, resp);
        } catch (e) {
          console.warn("Order failed", market.slug ?? market.id, String(e));
        }
      }
    } catch (e) {
      console.warn("Poll error", String(e));
    }
    const now = Date.now();
    if (config.autoRedeemIntervalMs > 0 && now - lastAutoRedeemTs >= config.autoRedeemIntervalMs) {
      lastAutoRedeemTs = now;
      try {
        const { redeemed, errors } = await autoRedeem(config.funderAddress, true);
        if (redeemed.length) console.log("Auto redeem:", redeemed.length, redeemed);
        if (errors.length) console.warn("Auto redeem errors:", errors);
      } catch (e) {
        console.warn("Auto redeem failed:", String(e));
      }
    }
    await new Promise((r) => setTimeout(r, config.pollMs));
  }
}

run();
