function env(key: string, def: string): string {
  const v = process.env[key];
  return (v !== undefined && v !== "") ? v : def;
}

function envNum(key: string, def: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export const config = {
  privateKey: env("PRIVATE_KEY", ""),
  funderAddress: env("FUNDER_ADDRESS", ""),
  signatureType: envNum("SIGNATURE_TYPE", 2) as 0 | 1 | 2,
  clobHost: env("CLOB_HOST", "https://clob.polymarket.com"),
  gammaHost: env("GAMMA_HOST", "https://gamma-api.polymarket.com"),
  chainId: envNum("CHAIN_ID", 137),
  orderSizeUsd: envNum("ORDER_SIZE_USD", 5),
  minEdge: envNum("MIN_EDGE", 0.02),
  pollMs: envNum("POLL_MS", 10000),
  rpcUrl: env("RPC_URL", "https://polygon-rpc.com"),
  dataApiHost: env("DATA_API_HOST", "https://data-api.polymarket.com"),
  autoRedeemIntervalMs: envNum("AUTO_REDEEM_INTERVAL_MS", 300000),
  approveOnStart: env("APPROVE_ON_START", "true").toLowerCase() === "true",
};

export const CTF_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
export const USDC_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
export const PROXY_FACTORY_ADDRESS = "0xaB45c5A4B0c941a2F231C04C3f49182e1A254052";

export const CRYPTO_SERIES_SLUGS = ["15m", "hourly"] as const;
