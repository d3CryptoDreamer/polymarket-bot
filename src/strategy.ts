import { config } from "./config";

export type Side = "BUY" | "SELL";

export interface OrderSignal {
  side: Side;
  tokenId: string;
  price: number;
  size: number;
  tickSize: string;
  minSize: number;
}

export function shouldBuyYes(midpointYes: number, edge: number): boolean {
  return midpointYes < 0.5 - edge;
}

export function shouldSellYes(midpointYes: number, edge: number): boolean {
  return midpointYes > 0.5 + edge;
}

export function computeSignal(
  tokenIdYes: string,
  tokenIdNo: string,
  priceYes: number,
  priceNo: number,
  tickSize: string,
  minSize: number,
  sizeUsd: number
): OrderSignal | null {
  const mid = priceYes;
  const edge = config.minEdge;
  if (shouldBuyYes(mid, edge)) {
    const price = Math.min(0.5 - edge, Math.floor((mid - 0.01) * 100) / 100);
    const p = Math.max(0.01, Math.min(0.99, price));
    const size = Math.max(minSize, sizeUsd / p);
    return { side: "BUY", tokenId: tokenIdYes, price: p, size, tickSize, minSize };
  }
  if (shouldSellYes(mid, edge)) {
    const price = Math.max(0.5 + edge, Math.ceil((mid + 0.01) * 100) / 100);
    const p = Math.max(0.01, Math.min(0.99, price));
    const size = Math.max(minSize, sizeUsd / p);
    return { side: "SELL", tokenId: tokenIdYes, price: p, size, tickSize, minSize };
  }
  return null;
}

export function roundToTick(price: number, tickSize: string): number {
  const tick = parseFloat(tickSize);
  if (!Number.isFinite(tick) || tick <= 0) return Math.round(price * 100) / 100;
  return Math.round(price / tick) * tick;
}
