"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useUnlockedWallet } from "@/components/wallet-provider";
import { CopyButton } from "@/components/copy-button";
import {
  getBalance,
  quotePrice,
  uploadFile,
  type LibraryItem,
} from "@/lib/arweave";
import { FILE_SIZE_WARN_BYTES } from "@/lib/tags";
import {
  arProtocolUrl,
  arweaveUrl,
  formatAr,
  formatBytes,
} from "@/lib/format";

export function FileUploader() {
  const { jwk, address } = useUnlockedWallet();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<LibraryItem | null>(null);
  const [pending, setPending] = useState(false);

  const priceQuery = useQuery({
    queryKey: ["price", file?.size],
    queryFn: () => quotePrice(file!.size),
    enabled: Boolean(file && file.size > 0),
  });

  const balanceQuery = useQuery({
    queryKey: ["balance", address],
    queryFn: () => getBalance(address),
  });

  function takeFile(next: File | null) {
    setFile(next);
    setError(null);
    setUploaded(null);
    setProgress(null);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    takeFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    takeFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to store.");
      return;
    }
    setError(null);
    setUploaded(null);
    setPending(true);
    setProgress(0);
    try {
      const item = await uploadFile(file, jwk, ({ pctComplete }) => {
        setProgress(pctComplete);
      });
      setUploaded(item);
      setProgress(100);
      queryClient.setQueryData<LibraryItem[]>(["files", address], (old) => {
        const next = [item, ...(old ?? [])];
        const seen = new Set<string>();
        return next.filter((entry) => {
          if (seen.has(entry.id)) return false;
          seen.add(entry.id);
          return true;
        });
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["balance", address] }),
        queryClient.invalidateQueries({ queryKey: ["files", address] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setProgress(null);
    } finally {
      setPending(false);
    }
  }

  const tooLarge = Boolean(file && file.size > FILE_SIZE_WARN_BYTES);
  const insufficient =
    priceQuery.data &&
    balanceQuery.data &&
    BigInt(balanceQuery.data.winston) < BigInt(priceQuery.data.winston);

  return (
    <section className="rounded-sm border border-line bg-panel p-5 sm:p-7">
      <h2 className="font-display text-2xl text-ink italic">Store a file</h2>
      <p className="mt-2 text-sm text-muted">
        Paid in AR from this wallet. The file is signed here, then written to
        Arweave L1.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          aria-label="Choose a file to store"
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-10 text-center transition-colors ${
            dragOver ? "border-gold bg-gold/5" : "border-line hover:border-gold/60"
          }`}
        >
          <input
            type="file"
            onChange={onInput}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          <span className="text-sm text-ink">
            {file ? file.name : "Drop a file here, or browse"}
          </span>
          <span className="text-xs text-muted">
            {file ? formatBytes(file.size) : "Stays on Arweave permanently"}
          </span>
        </label>

        {tooLarge ? (
          <p className="text-sm text-gold">
            This file is larger than 25 MB. The browser must hold it in memory
            to sign, so the upload may be slow or fail.
          </p>
        ) : null}

        {file ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">Size</dt>
              <dd className="mt-1 text-ink">{formatBytes(file.size)}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">
                Network fee
              </dt>
              <dd className="mt-1 text-ink">
                {priceQuery.isLoading
                  ? "Estimating…"
                  : priceQuery.data
                    ? `${formatAr(priceQuery.data.ar)} AR`
                    : priceQuery.isError
                      ? "Could not quote"
                      : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">
                Wallet
              </dt>
              <dd className="mt-1 text-ink">
                {balanceQuery.data
                  ? `${formatAr(balanceQuery.data.ar)} AR`
                  : "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        {insufficient ? (
          <p className="text-sm text-danger">
            Not enough AR to cover the estimated fee.
          </p>
        ) : null}

        {progress != null ? (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Uploading</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="h-full bg-gold transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending || !file || Boolean(insufficient)}
          className="self-start rounded-sm bg-gold px-5 py-2.5 text-sm font-medium text-paper hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Writing to Arweave…" : "Store forever"}
        </button>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        {uploaded ? (
          <div className="rounded-sm border border-gold/40 bg-gold/5 p-4 text-sm">
            <p className="text-ink">Stored. This URL is permanent.</p>
            <a
              href={arweaveUrl(uploaded.id)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block truncate font-mono text-xs text-gold hover:underline"
            >
              {arweaveUrl(uploaded.id)}
            </a>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton
                value={arweaveUrl(uploaded.id)}
                label="Copy HTTPS"
                className="rounded-sm border border-line px-3 py-1.5 text-xs text-ink hover:border-gold"
              />
              <CopyButton
                value={arProtocolUrl(uploaded.id)}
                label="Copy ar://"
                className="rounded-sm border border-line px-3 py-1.5 text-xs text-ink hover:border-gold"
              />
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}
