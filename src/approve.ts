import { Contract, Wallet, JsonRpcProvider, Interface, MaxUint256 } from "ethers";
import { config, USDC_POLYGON, CTF_ADDRESS, PROXY_FACTORY_ADDRESS } from "./config";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const PROXY_FACTORY_ABI = [
  "function proxy(tuple(address to, uint8 typeCode, bytes data, uint256 value)[] txns) external",
];

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(config.rpcUrl);
}

function getWallet(provider: JsonRpcProvider): Wallet {
  const pk = config.privateKey.startsWith("0x") ? config.privateKey : `0x${config.privateKey}`;
  return new Wallet(pk, provider);
}

function encodeApprove(token: string, spender: string, amount: bigint): string {
  const iface = Interface.from(ERC20_ABI);
  return iface.encodeFunctionData("approve", [spender, amount]);
}

export async function approveAllowance(
  spender: string = CTF_ADDRESS,
  amount: bigint = MaxUint256,
  token: string = USDC_POLYGON,
  useProxy = true
): Promise<ReturnType<Contract["approve"]>> {
  const provider = getProvider();
  const wallet = getWallet(provider);
  const data = encodeApprove(token, spender, amount);
  if (useProxy && config.funderAddress) {
    const factory = new Contract(PROXY_FACTORY_ADDRESS, PROXY_FACTORY_ABI, wallet);
    return factory.proxy([{ to: token, typeCode: 1, data, value: 0n }]) as ReturnType<Contract["approve"]>;
  }
  const erc20 = new Contract(token, ERC20_ABI, wallet);
  return erc20.approve(spender, amount);
}

export async function approveAllowanceAndWait(
  spender: string = CTF_ADDRESS,
  amount: bigint = MaxUint256,
  token: string = USDC_POLYGON,
  useProxy = true
) {
  const tx = await approveAllowance(spender, amount, token, useProxy);
  return tx.wait();
}

export async function hasAllowance(
  owner: string,
  spender: string,
  token: string = USDC_POLYGON,
  minAmount: bigint = 10n ** 6n
): Promise<boolean> {
  const provider = getProvider();
  const erc20 = new Contract(token, ERC20_ABI, provider);
  const allowance = await erc20.allowance(owner, spender);
  return allowance >= minAmount;
}
