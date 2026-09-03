import { addressFromJwk } from "@/lib/arweave";
import { parseArweaveJwk, type ArweaveJwk } from "@/lib/jwk";
import { createStore } from "svenjs";

export type WalletState =
  | { status: "locked"; jwk: null; address: null }
  | { status: "unlocked"; jwk: ArweaveJwk; address: string };

const locked: WalletState = { status: "locked", jwk: null, address: null };

export const wallet = createStore<WalletState>({ state: locked });

export async function unlockWallet(raw: string) {
  const jwk = parseArweaveJwk(raw);
  const address = await addressFromJwk(jwk);
  wallet.set({ status: "unlocked", jwk, address });
}

export function lockWallet() {
  wallet.set(locked);
}
