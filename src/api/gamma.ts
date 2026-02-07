import type { GammaEvent, GammaMarket, GammaSeries } from "../types";
import { config } from "../config";
import { CRYPTO_SERIES_SLUGS } from "../config";

const BASE = config.gammaHost;

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`Gamma ${path}: ${r.status}`);
  return r.json() as Promise<T>;
}

export async function listSeries(): Promise<GammaSeries[]> {
  return get<GammaSeries[]>("/series");
}

export async function getSeriesBySlug(slug: string): Promise<GammaSeries | null> {
  const all = await listSeries();
  return all.find((s) => s.slug?.toLowerCase() === slug.toLowerCase()) ?? null;
}

export async function listEvents(opts?: { closed?: boolean; limit?: number }): Promise<GammaEvent[]> {
  const params = new URLSearchParams();
  if (opts?.closed === false) params.set("closed", "false");
  params.set("limit", String(opts?.limit ?? 100));
  return get<GammaEvent[]>(`/events?${params}`);
}

export async function getEventBySlug(slug: string): Promise<GammaEvent | null> {
  const r = await fetch(`${BASE}/events?slug=${encodeURIComponent(slug)}`);
  if (!r.ok) return null;
  const arr = await r.json() as GammaEvent[];
  return arr[0] ?? null;
}

export function parseClobTokenIds(clobTokenIds?: string): { yes: string; no: string } | null {
  if (!clobTokenIds || typeof clobTokenIds !== "string") return null;
  const parts = clobTokenIds.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { yes: parts[0], no: parts[1] };
}

export async function fetchCryptoMarkets(): Promise<{ seriesSlug: string; event: GammaEvent; market: GammaMarket }[]> {
  const seriesList = await listSeries();
  const out: { seriesSlug: string; event: GammaEvent; market: GammaMarket }[] = [];
  for (const series of seriesList) {
    const slug = (series.slug ?? "").toLowerCase();
    const match = CRYPTO_SERIES_SLUGS.some((s) => slug === s || slug.includes(s));
    if (!match || !series.events?.length) continue;
    for (const event of series.events as GammaEvent[]) {
      if (!event.markets?.length || event.closed) continue;
      for (const market of event.markets as GammaMarket[]) {
        if (!market.active || market.closed || !market.enableOrderBook || !market.acceptingOrders) continue;
        const tokens = parseClobTokenIds(market.clobTokenIds);
        if (!tokens) continue;
        out.push({ seriesSlug: series.slug ?? slug, event, market });
      }
    }
  }
  if (out.length > 0) return out;
  const events = await listEvents({ closed: false, limit: 200 });
  for (const event of events) {
    const slug = (event.slug ?? "").toLowerCase();
    const seriesSlug = slug.includes("hourly") ? "hourly" : slug.includes("15") ? "15m" : null;
    if (!seriesSlug) continue;
    if (!event.markets?.length || event.closed) continue;
    for (const market of event.markets as GammaMarket[]) {
      if (!market.active || market.closed || !market.enableOrderBook || !market.acceptingOrders) continue;
      const tokens = parseClobTokenIds(market.clobTokenIds);
      if (!tokens) continue;
      out.push({ seriesSlug, event, market });
    }
  }
  return out;
}
