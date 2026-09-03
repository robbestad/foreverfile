import Arweave from "arweave";
import type { ArweaveJwk } from "@/lib/jwk";
import { sha256Hex } from "@/lib/hash";
import {
  recordFromNetwork,
  type ForeverFileRecord,
} from "@/lib/record";
import { APP_NAME, buildTags, type ArweaveTag } from "@/lib/tags";
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

export type LibraryItem = ForeverFileRecord;

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

const RECORD_QUERY = `
  query ForeverfileRecord($id: ID!) {
    transaction(id: $id) {
      id
      data { size }
      tags { name value }
      block { timestamp }
    }
  }
`;

export async function addressFromJwk(jwk: ArweaveJwk): Promise<string> {
  try {
    return await getArweave().wallets.jwkToAddress(jwk);
  } catch {
    throw new Error("Could not derive an address from this key.");
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
  return message ? `Network error: ${message}` : null;
}

type GraphQLFileNode = {
  id: string;
  data?: { size?: string | number };
  tags?: ArweaveTag[];
  block?: { timestamp?: number } | null;
};

function nodeToRecord(node: GraphQLFileNode): ForeverFileRecord {
  return recordFromNetwork({
    id: node.id,
    size: Number(node.data?.size ?? 0),
    timestamp: node.block?.timestamp ?? null,
    tags: node.tags,
  });
}

async function graphql<T>(
  query: string,
  variables: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not reach the public network (${response.status}).`);
  }

  const payload = (await response.json()) as {
    errors?: { message?: string }[];
    data?: T;
  };

  const gqlError = graphqlErrorMessage(payload);
  if (gqlError) throw new Error(gqlError);

  if (!payload.data) {
    throw new Error("The public network returned an empty response.");
  }

  return payload.data;
}

export async function listForeverfiles(owner: string): Promise<LibraryItem[]> {
  const data = await graphql<{
    transactions?: { edges?: { node: GraphQLFileNode }[] };
  }>(FILES_QUERY, { owner });

  return (data.transactions?.edges ?? []).map(({ node }) => nodeToRecord(node));
}

function decodeB64(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf8");
  }
  const bin = atob(value);
  return new TextDecoder().decode(
    Uint8Array.from(bin, (char) => char.charCodeAt(0)),
  );
}

async function recordFromGatewayTx(
  id: string,
): Promise<ForeverFileRecord | null> {
  const response = await fetch(`${GATEWAY_URL}/tx/${id}`, {
    cache: "no-store",
  });

  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok && response.status !== 202) return null;

  const payload = (await response.json()) as {
    id?: string;
    data_size?: string | number;
    tags?: { name?: string; value?: string }[];
  };

  const tags: ArweaveTag[] = (payload.tags ?? []).flatMap((tag) => {
    if (!tag.name || !tag.value) return [];
    try {
      return [{ name: decodeB64(tag.name), value: decodeB64(tag.value) }];
    } catch {
      return [];
    }
  });

  return recordFromNetwork({
    id: payload.id ?? id,
    size: Number(payload.data_size ?? 0),
    timestamp: null,
    tags,
  });
}

export async function getRecord(
  id: string,
): Promise<ForeverFileRecord | null> {
  try {
    const data = await graphql<{ transaction?: GraphQLFileNode | null }>(
      RECORD_QUERY,
      { id },
    );
    if (data.transaction?.id) return nodeToRecord(data.transaction);
  } catch {
    // Fall through to the gateway transaction endpoint.
  }

  try {
    return await recordFromGatewayTx(id);
  } catch {
    return null;
  }
}

export async function fetchPublishedBytes(id: string): Promise<ArrayBuffer> {
  const response = await fetch(`${GATEWAY_URL}/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not retrieve the published file.");
  }
  return response.arrayBuffer();
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
  const sha256 = await sha256Hex(data);
  const tx = await arweave.createTransaction({ data }, jwk);

  for (const tag of buildTags(file, sha256)) {
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
    sha256,
    appName: APP_NAME,
  };
}
