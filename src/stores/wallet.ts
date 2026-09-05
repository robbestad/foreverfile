import { addressFromJwk } from "@/lib/arweave";
import { parseArweaveJwk, type ArweaveJwk } from "@/lib/jwk";
import { createStore } from "svenjs";

export type WalletState =
  | { status: "locked"; jwk: null; address: null }
  | { status: "unlocked"; jwk: ArweaveJwk; address: string };

const locked: WalletState = { status: "locked", jwk: null, address: null };

export const wallet = createStore<WalletState>({ state: locked });

let walletGeneration = 0;
export function walletRevision() { return walletGeneration; }

export async function unlockWallet(raw: string, signal?: AbortSignal): Promise<boolean> {
  const generation = ++walletGeneration;
  const jwk = parseArweaveJwk(raw);
  let address: string;
  try {
    address = await addressFromJwk(jwk);
  } catch (error) {
    if (signal?.aborted || generation !== walletGeneration) return false;
    throw error;
  }
  if (signal?.aborted || generation !== walletGeneration) return false;
  wallet.set({ status: "unlocked", jwk, address });
  return true;
}

export function lockWallet() {
  walletGeneration++;
  wallet.set(locked);
}
