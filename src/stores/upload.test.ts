// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createArweave } from "@/lib/arweave";
import * as network from "@/lib/arweave";
import { prepareUpload, resumeUpload, endUpload, upload, localReceipt, hasUnfinishedUpload } from "./upload";
import { wallet, lockWallet } from "./wallet";
import { deferred, id, key } from "@/test/helpers";
vi.mock("@/lib/arweave", async (original) => ({ ...await original<typeof network>(), createArweave: vi.fn(), getBalance: vi.fn().mockResolvedValue({ ar: "1", winston: "9999" }) }));
vi.mock("@/stores/registration", () => ({ queueRegistration: vi.fn() }));
const approvals = { isPublic: true, irreversible: true, notPrivate: true };
let client: ReturnType<typeof createArweave>;
let sign: ReturnType<typeof vi.fn<ReturnType<typeof createArweave>["transactions"]["sign"]>>;
let postIds: string[];
beforeEach(async () => {
  const actual = await vi.importActual<typeof network>("@/lib/arweave");
  client = actual.createArweave();
  vi.mocked(createArweave).mockReturnValue(client);
  postIds = [];
  vi.spyOn(client, "createTransaction").mockImplementation(async ({ data }) => client.transactions.fromRaw({ data, data_size: String((data as Uint8Array).byteLength), reward: "1", owner: "", last_tx: "" }));
  sign = vi.fn(async (tx) => { await tx.prepareChunks(tx.data); tx.id = id; tx.signature = "signed"; });
  vi.spyOn(client.transactions, "sign").mockImplementation(sign);
  wallet.set({ status: "unlocked", address: id, jwk: key });
});
afterEach(() => { endUpload(); lockWallet(); vi.restoreAllMocks(); });
it("retains the same signed transaction after a lost accepted response", async () => {
  let attempt = 0;
  vi.spyOn(client.api, "post").mockImplementation(async (_endpoint, tx: any) => {
    postIds.push(tx.id);
    if (++attempt === 1) throw new Error("Response lost after acceptance");
    return { status: 208, data: {} } as any;
  });
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  await prepareUpload(new File(["x"], "receipt.txt"), approvals);
  expect(upload.get().status).toBe("ready"); expect(postIds).toEqual([]); expect(upload.get().record?.id).toBe(id);
  lockWallet(); await resumeUpload(); expect(upload.get().status).toBe("error"); expect(hasUnfinishedUpload()).toBe(true);
  await resumeUpload(); expect(postIds).toEqual([id, id]); expect(sign).toHaveBeenCalledTimes(1); expect(upload.get().status).toBe("complete");
  expect(localReceipt(id)?.timestamp).toBeNull(); expect(hasUnfinishedUpload()).toBe(false); consoleError.mockRestore();
});
it("stops on SDK-reported chunk errors and resumes from the retained chunk", async () => {
  let chunks = 0; let fail = true;
  vi.spyOn(client.api, "post").mockImplementation(async (endpoint, tx: any) => {
    if (endpoint === "tx") { postIds.push(tx.id); return { status: 200, data: {} } as any; }
    chunks++;
    if (chunks === 3 && fail) { fail = false; return { status: 503, data: { error: "busy" } } as any; }
    return { status: 200, data: {} } as any;
  });
  await prepareUpload(new File([new Uint8Array(1_000_000)], "chunks.bin"), approvals);
  await resumeUpload(); expect(upload.get().status).toBe("error"); expect(upload.get().progress).toBeGreaterThan(0); expect(upload.get().error).toContain("busy");
  await resumeUpload(); expect(upload.get().status).toBe("complete"); expect(sign).toHaveBeenCalledTimes(1); expect(postIds).toEqual([id]);
});
it("rejects simultaneous sessions and missing approvals before signing", async () => {
  await expect(prepareUpload(new File(["x"], "x"), { ...approvals, isPublic: false })).rejects.toThrow("Confirm");
  const pending = prepareUpload(new File(["x"], "x"), approvals);
  await expect(prepareUpload(new File(["x"], "x"), approvals)).rejects.toThrow("already exists");
  await pending; expect(sign).toHaveBeenCalledTimes(1);
});
it("locking while preparing prevents signing", async () => {
  const balance = deferred<network.Amount>(); vi.mocked(network.getBalance).mockReturnValueOnce(balance.promise);
  const pending = prepareUpload(new File(["x"], "x"), approvals);
  await vi.waitFor(() => expect(network.getBalance).toHaveBeenCalled()); lockWallet(); balance.resolve({ ar: "1", winston: "9999" });
  await expect(pending).rejects.toThrow("locked"); expect(sign).not.toHaveBeenCalled();
});
it("warns on tab close and ending a session invalidates pending transfer", async () => {
  const post = deferred<any>(); vi.spyOn(client.api, "post").mockReturnValue(post.promise);
  await prepareUpload(new File(["x"], "x"), approvals);
  const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
  const pending = resumeUpload(); endUpload(); post.resolve({ status: 200 }); await pending;
  expect(upload.get().status).toBe("idle"); expect(hasUnfinishedUpload()).toBe(false);
  const next = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(next); expect(next.defaultPrevented).toBe(false);
});

it.each(["lock", "switch", "reopen"])("discards a transaction when the wallet changes during signing: %s", async (change) => {
  const signing = deferred<void>();
  const started = deferred<void>();
  sign.mockImplementationOnce(async (tx) => {
    started.resolve();
    await signing.promise;
    tx.id = id;
    tx.signature = "signed";
  });
  const post = vi.spyOn(client.api, "post");
  const pending = prepareUpload(new File(["x"], "x"), approvals);
  const rejected = expect(pending).rejects.toThrow("during signing");
  await started.promise;
  lockWallet();
  if (change !== "lock") {
    wallet.set({ status: "unlocked", address: change === "switch" ? "b".repeat(43) : id, jwk: key });
  }
  signing.resolve();
  await rejected;
  expect(sign).toHaveBeenCalledTimes(1);
  expect(upload.get().status).toBe("error");
  expect(upload.get().record).toBeNull();
  expect(hasUnfinishedUpload()).toBe(false);
  await resumeUpload();
  expect(post).not.toHaveBeenCalled();
  const closing = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(closing);
  expect(closing.defaultPrevented).toBe(false);
});
