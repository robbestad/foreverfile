import { afterEach, expect, it, vi } from "vitest";
import { unlockWallet, lockWallet, wallet } from "./wallet";
import { addressFromJwk } from "@/lib/arweave";
import { deferred, id, key } from "@/test/helpers";
vi.mock("@/lib/arweave", () => ({ addressFromJwk: vi.fn() }));
afterEach(() => { lockWallet(); vi.resetAllMocks(); });
it("locking invalidates an in-flight unlock", async () => {
  const address = deferred<string>(); vi.mocked(addressFromJwk).mockReturnValueOnce(address.promise);
  const unlocking = unlockWallet(JSON.stringify(key)); lockWallet(); address.resolve(id);
  expect(await unlocking).toBe(false); expect(wallet.get().status).toBe("locked");
});
it("a newer unlock wins even with reversed responses", async () => {
  const address = deferred<string>(); vi.mocked(addressFromJwk).mockReturnValueOnce(address.promise).mockResolvedValueOnce("b".repeat(43));
  const old = unlockWallet(JSON.stringify(key)); expect(await unlockWallet(JSON.stringify(key))).toBe(true);
  address.resolve(id); expect(await old).toBe(false); expect(wallet.get().address).toBe("b".repeat(43));
});
it("aborted unlock does not open the wallet", async () => {
  const controller = new AbortController(); vi.mocked(addressFromJwk).mockResolvedValue(id); controller.abort();
  expect(await unlockWallet(JSON.stringify(key), controller.signal)).toBe(false); expect(wallet.get().status).toBe("locked");
});
it("discards a failed derivation after locking", async () => {
  const address = deferred<string>(); vi.mocked(addressFromJwk).mockReturnValueOnce(address.promise);
  const unlocking = unlockWallet(JSON.stringify(key)); lockWallet(); address.reject(new Error("old failure"));
  expect(await unlocking).toBe(false); expect(wallet.get().status).toBe("locked");
});
