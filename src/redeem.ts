import { Contract, Wallet, JsonRpcProvider, zeroPadValue } from "ethers";
import { config, CTF_ADDRESS, USDC_POLYGON, PROXY_FACTORY_ADDRESS } from "./config";

const CTF_ABI = [
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external",
];

const PROXY_FACTORY_ABI = [
  "function proxy(tuple(address to, uint8 typeCode, bytes data, uint256 value)[] txns) external",
];

const PARENT_COLLECTION_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";
const BINARY_INDEX_SETS = [1, 2];

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(config.rpcUrl);
}

function getWallet(provider: JsonRpcProvider): Wallet {
  const pk = config.privateKey.startsWith("0x") ? config.privateKey : `0x${config.privateKey}`;
  return new Wallet(pk, provider);
}

function conditionIdToBytes32(conditionId: string): string {
  const hex = conditionId.startsWith("0x") ? conditionId : `0x${conditionId}`;
  return zeroPadValue(hex, 32);
}

export async function redeem(conditionId: string, useProxy = true) {
  const provider = getProvider();
  const wallet = getWallet(provider);
  const ctf = new Contract(CTF_ADDRESS, CTF_ABI, wallet);
  const conditionIdBytes = conditionIdToBytes32(conditionId);
  const data = ctf.interface.encodeFunctionData("redeemPositions", [
    USDC_POLYGON,
    PARENT_COLLECTION_ID,
    conditionIdBytes,
    BINARY_INDEX_SETS,
  ]);
  if (useProxy && config.funderAddress) {
    const factory = new Contract(PROXY_FACTORY_ADDRESS, PROXY_FACTORY_ABI, wallet);
    const tx = await factory.proxy([{ to: CTF_ADDRESS, typeCode: 1, data, value: 0n }]);
    return tx;
  }
  return ctf.redeemPositions(USDC_POLYGON, PARENT_COLLECTION_ID, conditionIdBytes, BINARY_INDEX_SETS);
}

export async function redeemAndWait(conditionId: string, useProxy = true) {
  const tx = await redeem(conditionId, useProxy);
  return tx.wait();
}

export interface RedeemablePosition {
  conditionId: string;
  size: number;
  title?: string;
  negativeRisk?: boolean;
}

export async function getRedeemableConditionIds(userAddress: string): Promise<RedeemablePosition[]> {
  const url = `${config.dataApiHost}/positions?user=${encodeURIComponent(userAddress)}&redeemable=true&limit=500`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const list = (await r.json()) as { conditionId: string; size: number; title?: string; negativeRisk?: boolean }[];
  const seen = new Set<string>();
  const out: RedeemablePosition[] = [];
  for (const p of list) {
    if (!p.conditionId || seen.has(p.conditionId)) continue;
    seen.add(p.conditionId);
    out.push({
      conditionId: p.conditionId,
      size: p.size ?? 0,
      title: p.title,
      negativeRisk: p.negativeRisk,
    });
  }
  return out;
}

export async function autoRedeem(userAddress: string, useProxy = true): Promise<{ redeemed: string[]; errors: { conditionId: string; error: string }[] }> {
  const positions = await getRedeemableConditionIds(userAddress);
  const redeemed: string[] = [];
  const errors: { conditionId: string; error: string }[] = [];
  for (const p of positions) {
    if (p.negativeRisk) continue;
    try {
      await redeemAndWait(p.conditionId, useProxy);
      redeemed.push(p.conditionId);
    } catch (e) {
      errors.push({ conditionId: p.conditionId, error: String(e) });
    }
  }
  return { redeemed, errors };
}
