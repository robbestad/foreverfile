"use client";

import { useQuery } from "@tanstack/react-query";
import { FileLibrary } from "@/components/file-library";
import { FileUploader } from "@/components/file-uploader";
import { CopyButton } from "@/components/copy-button";
import { useUnlockedWallet } from "@/components/wallet-provider";
import { getBalance } from "@/lib/arweave";
import { formatAr, truncateAddress } from "@/lib/format";

export function Dashboard() {
  const { address, lock } = useUnlockedWallet();
  const balanceQuery = useQuery({
    queryKey: ["balance", address],
    queryFn: () => getBalance(address),
    refetchInterval: 30_000,
  });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm tracking-[0.28em] text-gold uppercase">
            Foreverfile
          </p>
          <p className="mt-2 font-mono text-sm text-ink" title={address}>
            {truncateAddress(address, 8)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">
            {balanceQuery.isLoading
              ? "Balance…"
              : balanceQuery.data
                ? `${formatAr(balanceQuery.data.ar)} AR`
                : "Balance unavailable"}
          </span>
          <CopyButton
            value={address}
            label="Copy address"
            className="rounded-sm border border-line px-3 py-1.5 text-ink hover:border-gold"
          />
          <button
            type="button"
            onClick={lock}
            className="rounded-sm border border-line px-3 py-1.5 text-ink hover:border-danger hover:text-danger"
          >
            Lock
          </button>
        </div>
      </header>

      <main className="flex-1 py-8">
        <FileUploader />
        <FileLibrary />
      </main>

      <footer className="border-t border-line py-6 text-xs text-muted">
        Files are public on Arweave. The key never leaves this browser.
      </footer>
    </div>
  );
}
