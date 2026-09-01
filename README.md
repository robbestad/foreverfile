# Foreverfile

Store a file forever on [Arweave](https://arweave.org). Unlock the app with your Arweave JWK. The private key stays in the current browser tab — it is never written to disk or sent to a server.

## Requirements

- Node.js 20.9 or newer
- An Arweave wallet JSON Web Key (`wallet.json`) with enough AR to pay the L1 data fee

## Setup

```shell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Paste the JWK or choose the key file, then unlock.

```shell
npm test
npm run build
```

## How it works

1. The JWK is parsed in the browser (`kty: RSA` plus `n`, `e`, `d`, `p`, `q`, `dp`, `dq`, `qi`).
2. The address is derived with `arweave-js`. Balance and a fee quote come from `arweave.net`.
3. The file is signed locally and uploaded in chunks to Arweave L1.
4. Uploads are tagged `App-Name: foreverfile` so this wallet’s files can be listed via GraphQL.

Lock or close the tab to drop the key from memory. Do not commit `wallet.json`.

## Deploy

Vercel detects Next.js. The previous Nx output path is gone — `vercel.json` now uses the stock Next build.
