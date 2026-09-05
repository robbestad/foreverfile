import Arweave from "arweave";
import type { ArweaveJwk } from "@/lib/jwk";
import { isRecordId, recordFromNetwork, type ForeverFileRecord } from "@/lib/record";
import { APP_NAME, FILE_SIZE_WARN_BYTES, type ArweaveTag } from "@/lib/tags";
import { winstonToAr } from "@/lib/format";
import { METADATA_TIMEOUT, TRANSFER_TIMEOUT, withDeadline } from "@/lib/network";

export const GATEWAY_HOST = "arweave.net";
export const GATEWAY_URL = `https://${GATEWAY_HOST}`;

/** Per-client adapter: never replaces global fetch or shares operation signals. */
export function createArweave(signal?: AbortSignal): Arweave {
  const client = Arweave.init({ host: GATEWAY_HOST, port: 443, protocol: "https" });
  const request = client.api.request.bind(client.api);
  client.api.request = (endpoint, init) => withDeadline(
    signal ?? init?.signal ?? undefined,
    init?.method === "POST" ? TRANSFER_TIMEOUT : METADATA_TIMEOUT,
    (requestSignal) => request(endpoint, { ...init, signal: requestSignal }),
  );
  return client;
}
let client: Arweave | null = null;
export function getArweave(): Arweave { return client ??= createArweave(); }
export type Amount = { winston: string; ar: string };
export type LibraryItem = ForeverFileRecord;
export type RecordResult =
  | { kind: "found"; record: ForeverFileRecord }
  | { kind: "pending" }
  | { kind: "not-found" };
export type LibraryPage = { records: LibraryItem[]; cursor: string | null; hasNextPage: boolean };

const FIELDS = "id data { size } tags { name value } block { timestamp }";
const FILES_QUERY = `query ForeverfileLibrary($owner: String!, $after: String) {
  transactions(owners: [$owner], tags: [{ name: "App-Name", values: ["${APP_NAME}"] }], first: 50, after: $after, sort: HEIGHT_DESC) {
    pageInfo { hasNextPage } edges { cursor node { ${FIELDS} } }
  }
}`;
const RECORD_QUERY = `query ForeverfileRecord($id: ID!) { transaction(id: $id) { ${FIELDS} } }`;

export async function addressFromJwk(jwk: ArweaveJwk): Promise<string> {
  try { return await getArweave().wallets.jwkToAddress(jwk); }
  catch { throw new Error("Could not derive an address from this key."); }
}
function amount(value: unknown): Amount {
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new Error("Invalid network amount.");
  return { winston: value, ar: winstonToAr(value) };
}
async function readJson(url: string, signal?: AbortSignal, init?: RequestInit): Promise<any> {
  return withDeadline(signal, METADATA_TIMEOUT, async (signal) => {
    const response = await fetch(url, { ...init, cache: "no-store", signal });
    if (response.status !== 200) throw new Error(`Could not reach the public network (${response.status}).`);
    return response.json();
  });
}
export async function getBalance(address: string, signal?: AbortSignal): Promise<Amount> {
  return withDeadline(signal, METADATA_TIMEOUT, async (signal) => {
    const response = await fetch(`${GATEWAY_URL}/wallet/${address}/balance`, { signal, cache: "no-store" });
    if (response.status !== 200) throw new Error(`Could not retrieve the balance (${response.status}).`);
    return amount((await response.text()).trim());
  });
}
export async function quotePrice(byteSize: number, signal?: AbortSignal): Promise<Amount> {
  return withDeadline(signal, METADATA_TIMEOUT, async (signal) => {
    const response = await fetch(`${GATEWAY_URL}/price/${byteSize}`, { signal, cache: "no-store" });
    if (response.status !== 200) throw new Error(`Could not estimate the fee (${response.status}).`);
    return amount((await response.text()).trim());
  });
}
function invalid(): never { throw new Error("The public network returned invalid record data."); }
function sizeOf(value: unknown): number {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) invalid();
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 0) invalid();
  return size;
}
function validateTags(tags: unknown): ArweaveTag[] {
  if (!Array.isArray(tags) || tags.some(t => !t || typeof t.name !== "string" || typeof t.value !== "string")) invalid();
  if (tags.some(t => t.name === "File-SHA256" && !/^[a-fA-F0-9]{64}$/.test(t.value))) invalid();
  return tags;
}
function nodeToRecord(node: any, expectedId?: string): ForeverFileRecord {
  if (!node || typeof node.id !== "string" || !isRecordId(node.id) || (expectedId && node.id !== expectedId)) invalid();
  const timestamp = node.block === null ? null : node.block?.timestamp;
  if (timestamp !== null && (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > Math.floor(Date.now() / 1000) + 300)) invalid();
  return recordFromNetwork({ id: node.id, size: sizeOf(node.data?.size), timestamp, tags: validateTags(node.tags) });
}
async function graphql(query: string, variables: Record<string, string | null>, signal?: AbortSignal): Promise<any> {
  const payload = await readJson(`${GATEWAY_URL}/graphql`, signal, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }),
  });
  if (!payload || payload.errors?.length || !payload.data) throw new Error("The public network returned an invalid response. Please try again.");
  return payload.data;
}
export async function listForeverfiles(owner: string, after: string | null = null, signal?: AbortSignal): Promise<LibraryPage> {
  const data = await graphql(FILES_QUERY, { owner, after }, signal);
  const txs = data.transactions;
  if (!Array.isArray(txs?.edges) || typeof txs?.pageInfo?.hasNextPage !== "boolean") invalid();
  const records = txs.edges.map((edge: any) => {
    if (typeof edge.cursor !== "string" || !edge.cursor) invalid();
    return nodeToRecord(edge.node);
  });
  const cursor = txs.edges.at(-1)?.cursor ?? null;
  if (txs.pageInfo.hasNextPage && (!cursor || cursor === after)) invalid();
  return { records, cursor, hasNextPage: txs.pageInfo.hasNextPage };
}
async function recordFromGatewayTx(id: string, signal?: AbortSignal): Promise<RecordResult> {
  return withDeadline(signal, METADATA_TIMEOUT, async (signal) => {
    const response = await fetch(`${GATEWAY_URL}/tx/${id}`, { cache: "no-store", signal });
    if (response.status === 404) return { kind: "not-found" };
    if (response.status === 202) return { kind: "pending" };
    if (response.status !== 200) throw new Error(`Could not look up the transaction (${response.status}).`);
    const payload = await response.json();
    if (!Array.isArray(payload?.tags)) invalid();
    const tags = payload.tags.map((tag: any) => {
      if (typeof tag?.name !== "string" || typeof tag?.value !== "string" || !/^[\w-]*$/.test(tag.name) || !/^[\w-]*$/.test(tag.value)) invalid();
      return { name: Arweave.utils.b64UrlToString(tag.name), value: Arweave.utils.b64UrlToString(tag.value) };
    });
    return { kind: "found", record: nodeToRecord({ id: payload.id, data: { size: payload.data_size }, tags, block: null }, id) };
  });
}
export async function getRecord(id: string, signal?: AbortSignal): Promise<RecordResult> {
  if (!isRecordId(id)) throw new Error("Invalid record ID.");
  let lookupError: unknown;
  try {
    const data = await graphql(RECORD_QUERY, { id }, signal);
    if (!("transaction" in data)) invalid();
    if (data.transaction !== null) return { kind: "found", record: nodeToRecord(data.transaction, id) };
  } catch (error) {
    signal?.throwIfAborted();
    lookupError = error;
  }
  const fallback = await recordFromGatewayTx(id, signal);
  if (fallback.kind === "not-found" && lookupError) throw lookupError;
  return fallback;
}
export class PendingBytesError extends Error {
  constructor() { super("The published bytes are still pending. Please try again."); }
}
export class FileTooLargeError extends Error {
  constructor() { super("Files must be 25 MiB or smaller for publishing and byte verification."); }
}
export function checkFileSize(size: number) {
  if (size > FILE_SIZE_WARN_BYTES) throw new FileTooLargeError();
}
export async function fetchPublishedBytes(id: string, signal?: AbortSignal, expectedSize?: number): Promise<ArrayBuffer> {
  if (expectedSize !== undefined) checkFileSize(expectedSize);
  return withDeadline(signal, TRANSFER_TIMEOUT, async (signal) => {
    const response = await fetch(`${GATEWAY_URL}/${id}`, { cache: "no-store", signal });
    if (response.status === 202) throw new PendingBytesError();
    if (response.status !== 200 || response.headers.has("content-range")) throw new Error(`Could not retrieve the complete published file (${response.status}).`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("The network returned no file body.");
    const parts: Uint8Array[] = [];
    let received = 0;
    try {
      const length = response.headers.get("content-length");
      if (length !== null) checkFileSize(sizeOf(length));
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        checkFileSize(received);
        parts.push(value);
      }
      if (expectedSize !== undefined && received !== expectedSize) throw new Error("Published file size does not match its record.");
      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
      return bytes.buffer;
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  });
}
