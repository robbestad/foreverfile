"use client";

import { Dashboard } from "@/components/dashboard";
import { UnlockScreen } from "@/components/unlock-screen";
import { useWallet } from "@/components/wallet-provider";

export function AppShell() {
  const wallet = useWallet();

  return (
    <div className="relative min-h-dvh bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold"
      />
      {wallet.status === "locked" ? <UnlockScreen /> : <Dashboard />}
    </div>
  );
}
