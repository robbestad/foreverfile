"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useWallet } from "@/components/wallet-provider";

export function UnlockScreen() {
  const wallet = useWallet();
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setRaw(text);
      setFileName(file.name);
      setError(null);
    } catch {
      setError("Could not read that file.");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await wallet.unlock(raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-16">
      <p className="font-display text-sm tracking-[0.28em] text-gold uppercase">
        Foreverfile
      </p>
      <h1 className="font-display mt-4 text-4xl leading-tight text-ink italic sm:text-5xl">
        Unlock with your Arweave key
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
        Paste a JWK or choose a <code className="text-ink">wallet.json</code>{" "}
        file. The private key stays in this tab, is never sent to a server, and
        is discarded when you lock or close the window.
      </p>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-4">
        <label htmlFor={fieldId} className="text-xs tracking-wide text-muted uppercase">
          Arweave JWK
        </label>
        <textarea
          id={fieldId}
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            setFileName(null);
            setError(null);
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.currentTarget.form?.requestSubmit();
            }
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          rows={10}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          placeholder='{ "kty": "RSA", "n": "…", "d": "…" }'
          className="min-h-48 w-full resize-y rounded-sm border border-line bg-panel px-4 py-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-muted/50 focus:border-gold"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="sr-only"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-sm border border-line px-3 py-2 text-ink hover:border-gold"
            >
              Choose wallet.json
            </button>
            <span className="truncate">
              {fileName ?? "No file selected"}
            </span>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-gold px-5 py-2.5 text-sm font-medium text-paper hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Unlocking…" : "Unlock"}
          </button>
        </div>

        {error ? (
          <p id={`${fieldId}-error`} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
