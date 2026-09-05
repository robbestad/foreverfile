import { queueRegistration } from "@/stores/registration";
import { createStore } from "svenjs";
import { checkFileSize, createArweave, getBalance } from "@/lib/arweave";
import { sha256Hex } from "@/lib/hash";
import { APP_NAME, buildTags } from "@/lib/tags";
import type { ForeverFileRecord } from "@/lib/record";
import { wallet, walletRevision } from "@/stores/wallet";

type Client = ReturnType<typeof createArweave>;
type Transaction = Awaited<ReturnType<Client["createTransaction"]>>;
type Uploader = Awaited<ReturnType<Client["transactions"]["getUploader"]>>;
export type UploadState = {
  sessionId: number;
  status: "idle" | "preparing" | "ready" | "uploading" | "error" | "complete";
  record: ForeverFileRecord | null;
  progress: number;
  error: string | null;
};
const idle: UploadState = { sessionId: 0, status: "idle", record: null, progress: 0, error: null };
export const upload = createStore<UploadState>({ state: idle });
// SDK objects, controllers and byte buffers are deliberately outside cloned store state.
type Session = { id: number; controller: AbortController; client: Client; tx?: Transaction; uploader?: Uploader; running: boolean };
let session: Session | null = null;
let generation = 0;
const receipts = new Map<string, ForeverFileRecord>();
export function localReceipt(id: string) { return receipts.get(id) ?? null; }
export function hasUnfinishedUpload() { return session !== null; }
function beforeUnload(event: BeforeUnloadEvent) {
  if (hasUnfinishedUpload()) { event.preventDefault(); event.returnValue = ""; }
}
function release() {
  session?.controller.abort();
  session = null;
  if (typeof window !== "undefined") window.removeEventListener("beforeunload", beforeUnload);
}
/** Explicitly forgets local progress. It cannot undo a transaction already sent. */
export function endUpload() {
  release();
  upload.set({ ...idle, sessionId: ++generation });
}
export type Approvals = { isPublic: boolean; irreversible: boolean; notPrivate: boolean };
export async function prepareUpload(file: File, approvals: Approvals): Promise<void> {
  if (session) throw new Error("An upload session already exists. Resume or end it first.");
  if (!approvals.isPublic || !approvals.irreversible || !approvals.notPrivate) throw new Error("Confirm all publication consequences first.");
  const current = wallet.get();
  const revision = walletRevision();
  if (current.status !== "unlocked") throw new Error("Unlock your key before signing.");
  checkFileSize(file.size);
  if (!file.size) throw new Error("That file is empty.");
  const controller = new AbortController();
  const own = { id: ++generation, controller, client: createArweave(controller.signal), running: true } as Session;
  session = own;
  window.addEventListener("beforeunload", beforeUnload);
  upload.set({ ...idle, sessionId: own.id, status: "preparing" });
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    controller.signal.throwIfAborted();
    const sha256 = await sha256Hex(data);
    controller.signal.throwIfAborted();
    const tx = await own.client.createTransaction({ data }, current.jwk);
    for (const tag of buildTags(file, sha256)) tx.addTag(tag.name, tag.value);
    const balance = await getBalance(current.address, controller.signal);
    if (BigInt(balance.winston) < BigInt(tx.reward)) throw new Error("Not enough AR to pay the network fee.");
    controller.signal.throwIfAborted();
    if (revision !== walletRevision() || wallet.get().status !== "unlocked") throw new Error("The key changed or was locked before signing. Authorize again.");
    await own.client.transactions.sign(tx, current.jwk);
    if (session !== own) return;
    if (revision !== walletRevision() || wallet.get().status !== "unlocked") {
      throw new Error("The key changed or was locked during signing. Authorize again.");
    }
    own.tx = tx;
    own.running = false;
    upload.set({ ...upload.get(), status: "ready", record: {
      id: tx.id, name: file.name, contentType: file.type || "application/octet-stream",
      size: file.size, timestamp: null, sha256, appName: APP_NAME,
    } });
  } catch (error) {
    if (session !== own) return;
    release(); // Nothing was sent; discard any transaction signed with a stale key.
    upload.set({ ...upload.get(), status: "error", error: error instanceof Error ? error.message : "Could not prepare publication." });
    throw error;
  }
}
export async function resumeUpload(): Promise<void> {
  const own = session;
  if (!own?.tx || own.running) return;
  own.running = true;
  upload.set({ ...upload.get(), status: "uploading", error: null });
  try {
    own.uploader ??= await own.client.transactions.getUploader(own.tx);
    const uploader = own.uploader;
    // The user explicitly requested retry; avoid the SDK's hidden 40-second retry delay.
    uploader.lastResponseError = "";
    while (!uploader.isComplete) {
      own.controller.signal.throwIfAborted();
      await uploader.uploadChunk();
      if (session !== own) return;
      if (uploader.lastResponseError || uploader.lastResponseStatus < 200 || uploader.lastResponseStatus >= 300) {
        throw new Error(`Transfer paused (${uploader.lastResponseStatus}): ${uploader.lastResponseError || "unexpected response"}. Resume to retry this same transaction.`);
      }
      upload.set({ ...upload.get(), progress: uploader.pctComplete });
    }
    if (session !== own) return;
    const record = upload.get().record!;
    receipts.set(record.id, record);
    release();
    upload.set({ ...upload.get(), status: "complete", progress: 100, error: null });
    queueRegistration(record.id);
  } catch (error) {
    if (session !== own) return;
    upload.set({ ...upload.get(), status: "error", error: error instanceof Error ? error.message : "Transfer paused. Resume to try again." });
  } finally {
    own.running = false;
  }
}
