import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";
import { config } from "../config";

export type ApiCreds = { apiKey: string; secret: string; passphrase: string };

export function createClobClient(creds?: ApiCreds | null): ClobClient {
  const pk = config.privateKey.startsWith("0x") ? config.privateKey : `0x${config.privateKey}`;
  const signer = new Wallet(pk);
  if (creds) {
    return new ClobClient(
      config.clobHost,
      config.chainId,
      signer,
      creds,
      config.signatureType,
      config.funderAddress
    );
  }
  return new ClobClient(config.clobHost, config.chainId, signer);
}

export async function ensureApiCreds(client: ClobClient): Promise<ApiCreds> {
  const creds = await client.createOrDeriveApiKey();
  return {
    apiKey: creds.apiKey,
    secret: creds.secret,
    passphrase: creds.passphrase,
  };
}
