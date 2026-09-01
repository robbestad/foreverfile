"use client";

import { useQuery } from "@tanstack/react-query";
import { CopyButton } from "@/components/copy-button";
import { useUnlockedWallet } from "@/components/wallet-provider";
import { listForeverfiles } from "@/lib/arweave";
import {
  arProtocolUrl,
  arweaveUrl,
  formatBytes,
  formatTimestamp,
} from "@/lib/format";

export function FileLibrary() {
  const { address } = useUnlockedWallet();
  const query = useQuery({
    queryKey: ["files", address],
    queryFn: () => listForeverfiles(address),
  });

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h2 className="font-display text-2xl text-ink italic">Your files</h2>
        <p className="text-xs text-muted">Tagged App-Name: foreverfile</p>
      </div>

      {query.isLoading ? (
        <p className="mt-6 text-sm text-muted">Looking up this wallet on Arweave…</p>
      ) : query.isError ? (
        <p role="alert" className="mt-6 text-sm text-danger">
          {query.error instanceof Error
            ? query.error.message
            : "Could not load files."}
        </p>
      ) : !query.data?.length ? (
        <p className="mt-6 text-sm text-muted">
          Nothing stored yet. New uploads can take a few minutes to appear in
          GraphQL after they land on L1.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-sm border border-line">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-panel text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((file) => (
                <tr key={file.id} className="border-t border-line">
                  <td className="max-w-[14rem] truncate px-4 py-3 text-ink">
                    {file.name}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatTimestamp(file.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={arweaveUrl(file.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-gold hover:underline"
                      >
                        {file.id.slice(0, 8)}…
                      </a>
                      <CopyButton
                        value={arweaveUrl(file.id)}
                        label="HTTPS"
                        className="text-xs text-muted hover:text-ink"
                      />
                      <CopyButton
                        value={arProtocolUrl(file.id)}
                        label="ar://"
                        className="text-xs text-muted hover:text-ink"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
