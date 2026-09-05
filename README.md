<p align="center">
  <img src="brand/foreverfile-lockup.svg" alt="ForeverFile" width="420">
</p>

<p align="center">
  <strong>A permanent place for important files.</strong><br>
  Publish a public record that cannot silently change.
</p>

<p align="center">
  <a href="https://foreverfile.xyz">foreverfile.xyz</a>
  ·
  Built with <a href="https://svenjs.xyz">SvenJS 3.3.0</a>
</p>

---

Cloud folders get edited. Links rot. “The file” becomes a different file, and nobody can prove it.

ForeverFile publishes **one exact version** of a file as a public record. Anyone with the link can retrieve it. Anyone with a copy can check that it still matches. The record does not live on this website — this site is a window onto a long-lived network.

**Public.** Anyone with the record can view or download it.  
**Unchanged.** This version cannot silently become a different file.  
**Persistent.** Built to outlast ordinary hosting and single accounts.

You will review the consequences before anything is written. The publication key stays in the current browser tab. ForeverFile never receives it.

### What this is not

Not private. Not a backup. Not reversible. Not crypto.

If it should stay confidential, do not publish it. Deleting a bookmark does not unpublish the file.

---

## Give this to an LLM

Paste the prompt below into ChatGPT, Codex, Claude, or another assistant when you want help **using** ForeverFile — preparing a file, publishing it, sharing the record, or verifying a copy later.

```text
Help me use ForeverFile (https://foreverfile.xyz) to publish and later verify an exact file.

ForeverFile is a browser app that writes a public, unchangeable record of one file to Arweave. The site is only a window onto that record.

Facts you must not invent around:
- Publishing is public. Anyone with the record URL can view or download the file.
- This version cannot be edited, overwritten, or silently swapped. A later file is a new record.
- Deleting a link or this website does not remove the file from the network.
- The Arweave JWK (often wallet.json) is pasted or chosen in the tab. It must never be sent to a ForeverFile server, committed to git, or written to disk by you.
- Identity is SHA-256 of the file bytes. Change one byte, and it is a different record.
- Uploads are tagged App-Name: foreverfile so records from the same key can be listed.
- Network fee is paid in AR on Arweave L1 from the key in the tab.

Walk me through, in order:
1. Whether this file should be published at all (private, confidential, or replaceable files should stop here).
2. What I will see on /publish: choose file → review three acknowledgements → authorize with the key → write the record.
3. How to share foreverfile.xyz/f/<id> and how someone else verifies on /verify (paste the link, optionally choose a local copy).
4. How to list records later on /library with the same key, then lock the key.

If I paste a path, filename, or error, diagnose it against those facts. Do not offer a “private ForeverFile”, a hosted wallet, or a way to edit a published record.
```

---

## Use it

Need an Arweave wallet? Generate an Arweave JWK with [arweave-keygen](https://github.com/robbestad/arweave-keygen), then keep the downloaded key file private and backed up securely. To fund it, get native AR from an exchange listed in [CoinGecko's Arweave markets](https://www.coingecko.com/en/coins/arweave#markets); availability and supported withdrawal networks vary by country and exchange.

1. Open [foreverfile.xyz/publish](https://foreverfile.xyz/publish) and choose a file. The fingerprint is hashed in your browser.
2. Confirm it will be public and unchangeable. Authorize with an Arweave key that has enough AR for the one-time network fee.
3. Keep the record URL. Anyone can open it; anyone can verify a local copy against it.

To check a file later: [foreverfile.xyz/verify](https://foreverfile.xyz/verify) — paste the link, optionally choose the copy on disk.

---

## Run it locally

Requires Node.js 20.9 or newer. An Arweave JWK with AR is needed only if you publish.

```shell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```shell
npm test
npm run build
npm run preview
```

The private key stays in memory for the tab. Lock it or close the tab to drop it. Do not commit `wallet.json`.

### How a publish works

1. The file is hashed locally (SHA-256).
2. You acknowledge that it is public, unchangeable, and not confidential.
3. The JWK never leaves the tab. The file is signed locally and uploaded in chunks to Arweave L1.
4. The transaction is tagged `App-Name: foreverfile` so that key’s records can be listed via GraphQL.

Unknown record URLs render an in-page missing state (HTTP 200) rather than a server 404.

### Deploy

Vercel is configured as a Vite static site (`dist`). Direct visits to `/f/:id` are rewritten to a prerendered record shell; the record itself is loaded from the public network in the browser.


## Reliability and browser verification

SvenJS is pinned to 3.3.0, with automatic JSX configured in Vite and Vitest.
Publishing and byte verification accept files up to **25 MiB**. Metadata lookup
also supports larger records. Verification compares local SHA-256 against bytes
from the configured gateway; publisher tags alone cannot verify a file.

One upload session is retained in each tab's memory. Review and authorization
prepare a signed transaction; its ID appears before **Send signed transaction**.
A paused transfer resumes the same signed transaction and chunk progress. Internal
navigation and key locking do not stop an already signed transfer. Ending a
session frees local buffers but cannot undo a transaction already sent. Reloading
loses the in-memory session, so unfinished sessions trigger a close/reload warning.
No JWK or file bytes are persisted to disk by the app.

A successful upload means received, with confirmation still pending. Local receipts
remain available in the tab while indexing catches up. Metadata, price, and balance
requests have 20-second deadlines; byte and upload requests have 60-second deadlines.

Run `npm test`, `npm run typecheck`, `npm run build`, and `npm audit`.
Mounted component tests use happy-dom and emulate browser File cloning because
Node's structuredClone does not support happy-dom File objects. Real browser checks
must also cover development state cloning and production hydration.

For a reproducible development upload check, run `npm run dev` and open
`/scripts/browser-smoke.html`. This test harness generates a disposable key only in
memory and simulates every Arweave request, so it cannot publish to the network.
Generate the test wallet, select the synthetic file, review all acknowledgements,
and prepare/send. Release the first simulated chunk to see an error, resume the
same transaction, then release subsequent chunks. Navigate away and lock the test
wallet during transfer; progress remains visible and completion must not redirect
you away. Return to the session and open its receipt: it remains pending while the
simulated gateway has no indexed record. The harness is excluded from production.


## Shared public registry

The static frontend now uses `/api/records`, a Vercel Node function backed by
Neon Postgres. Only transaction IDs and public network metadata are stored.
The browser sends `POST /api/records` with exactly `{ "id": "<Arweave ID>" }`
after upload. The server fetches and validates metadata from Arweave, requires
the ForeverFile app tag, and upserts by ID. It does not trust client filenames,
hashes, sizes, or publication dates. JWKs and file bytes never enter this API.

Pending network transactions are saved as IDs and refreshed on catalog reads.
Reads also discover recent network publications, skipping malformed records.
Previously saved records remain available during gateway failures. This is a
public index, not proof of ownership or independent blockchain verification.

If registration fails, only public IDs are kept in a browser retry queue. The
app retries on reopening, regaining connectivity, or **Retry registration**;
this never signs or uploads a second transaction. The registry can supply saved
receipt metadata in another browser while the gateway is unavailable.

### Setup

1. Create a Neon **Free** database in Vercel Marketplace, region Frankfurt (`fra1`),
   with Neon Auth disabled. Connect it to this project. Use a separate database
   branch for preview deployments if preview data should be isolated.
2. Set the server-only `DATABASE_URL` in the required Vercel environments. Never
   give it a `VITE_` prefix or commit it. No database credentials are currently
   included in this repository.
3. With `DATABASE_URL` set locally (or in `.env.local`), run `npm run db:migrate`.
   The additive, repeatable migration creates the metadata table and indexes.
4. Redeploy the project. `GET /api/records` should return `{ "records": [] }`
   until a transaction is registered or discovered. `POST` returns `202` only
   after a pending ID has been durably saved, and `200` for saved metadata.

`npm run dev` and `npm run preview` serve the static UI. To include the real API
locally, use `npx vercel dev` with `DATABASE_URL` configured. Without a database,
the API returns 503 and registration remains retryable. An in-memory database is
never substituted for production persistence.

Tests execute the real schema and queries in PGlite (Postgres), exercising
idempotent writes, independent service instances, pending-to-confirmed updates,
invalid payloads, retry persistence, and gateway failures.
