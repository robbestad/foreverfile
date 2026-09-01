import Arweave from "arweave";
import type { ArweaveJwk } from "@/lib/jwk";
import { APP_NAME, buildTags, tagValue, type ArweaveTag } from "@/lib/tags";
import { winstonToAr } from "@/lib/format";

export const GATEWAY_HOST = "arweave.net";
export const GATEWAY_URL = `https://${GATEWAY_HOST}`;

let client: Arweave | null = null;

export function getArweave(): Arweave {
  client ??= Arweave.init({
    host: GATEWAY_HOST,
    port: 443,
    protocol: "https",
  });
  return client;
}

export type Amount = {
  winston: string;
  ar: string;
};

export type LibraryItem = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  timestamp: number | null;
};

export type UploadProgress = {
  pctComplete: number;
  uploadedChunks: number;
  totalChunks: number;
};

const FILES_QUERY = `
  query ForeverfileLibrary($owner: String!) {
    transactions(
      owners: [$owner]
      tags: [{ name: "App-Name", values: ["${APP_NAME}"] }]
      first: 50
      sort: HEIGHT_DESC
    ) {
      edges {
        node {
          id
          data { size }
          tags { name value }
          block { timestamp }
        }
      }
    }
  }
`;

export async function addressFromJwk(jwk: ArweaveJwk): Promise<string> {
  try {
    return await getArweave().wallets.jwkToAddress(jwk);
  } catch {
    throw new Error("Could not derive an Arweave address from this key.");
  }
}

export async function getBalance(address: string): Promise<Amount> {
  const winston = await getArweave().wallets.getBalance(address);
  return { winston, ar: winstonToAr(winston) };
}

export async function quotePrice(byteSize: number): Promise<Amount> {
  const winston = await getArweave().transactions.getPrice(byteSize);
  return { winston: String(winston), ar: winstonToAr(String(winston)) };
}

function graphqlErrorMessage(payload: {
  errors?: { message?: string }[];
}): string | null {
  const message = payload.errors?.[0]?.message;
  return message ? `Arweave GraphQL error: ${message}` : null;
}

type GraphQLFileNode = {
  id: string;
  data?: { size?: string | number };
  tags?: ArweaveTag[];
  block?: { timestamp?: number } | null;
};

export async function listForeverfiles(owner: string): Promise<LibraryItem[]> {
  const response = await fetch(`${GATEWAY_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: FILES_QUERY,
      variables: { owner },
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not list files (${response.status}).`);
  }

  const payload = (await response.json()) as {
    errors?: { message?: string }[];
    data?: {
      transactions?: { edges?: { node: GraphQLFileNode }[] };
    };
  };

  const gqlError = graphqlErrorMessage(payload);
  if (gqlError) throw new Error(gqlError);

  const edges = payload.data?.transactions?.edges ?? [];
  return edges.map(({ node }) => ({
    id: node.id,
    name: tagValue(node.tags, "File-Name") ?? node.id,
    contentType: tagValue(node.tags, "Content-Type") ?? "application/octet-stream",
    size: Number(node.data?.size ?? 0),
    timestamp: node.block?.timestamp ?? null,
  }));
}

export async function uploadFile(
  file: File,
  jwk: ArweaveJwk,
  onProgress?: (progress: UploadProgress) => void,
): Promise<LibraryItem> {
  if (file.size === 0) {
    throw new Error("That file is empty.");
  }

  const arweave = getArweave();
  const data = new Uint8Array(await file.arrayBuffer());
  const tx = await arweave.createTransaction({ data }, jwk);

  for (const tag of buildTags(file)) {
    tx.addTag(tag.name, tag.value);
  }

  const balance = await arweave.wallets.getBalance(
    await arweave.wallets.jwkToAddress(jwk),
  );
  if (BigInt(balance) < BigInt(tx.reward)) {
    throw new Error(
      `Not enough AR to pay the network fee (${winstonToAr(tx.reward)} AR).`,
    );
  }

  await arweave.transactions.sign(tx, jwk);
  const uploader = await arweave.transactions.getUploader(tx);

  while (!uploader.isComplete) {
    await uploader.uploadChunk();
    onProgress?.({
      pctComplete: uploader.pctComplete,
      uploadedChunks: uploader.uploadedChunks,
      totalChunks: uploader.totalChunks,
    });
  }

  return {
    id: tx.id,
    name: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    timestamp: Math.floor(Date.now() / 1000),
  };
}
