"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addressFromJwk } from "@/lib/arweave";
import { parseArweaveJwk, type ArweaveJwk } from "@/lib/jwk";

type Locked = {
  status: "locked";
  jwk: null;
  address: null;
};

type Unlocked = {
  status: "unlocked";
  jwk: ArweaveJwk;
  address: string;
};

type WalletContextValue = (Locked | Unlocked) & {
  unlock: (raw: string) => Promise<void>;
  lock: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Locked | Unlocked>({
    status: "locked",
    jwk: null,
    address: null,
  });

  const unlock = useCallback(async (raw: string) => {
    const jwk = parseArweaveJwk(raw);
    const address = await addressFromJwk(jwk);
    setSession({ status: "unlocked", jwk, address });
  }, []);

  const lock = useCallback(() => {
    setSession({ status: "locked", jwk: null, address: null });
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({ ...session, unlock, lock }),
    [session, unlock, lock],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider.");
  }
  return context;
}

export function useUnlockedWallet(): Unlocked & {
  unlock: (raw: string) => Promise<void>;
  lock: () => void;
} {
  const wallet = useWallet();
  if (wallet.status !== "unlocked") {
    throw new Error("Wallet is locked.");
  }
  return wallet;
}
