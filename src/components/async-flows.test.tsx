// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { create, flushSync, render, unmountRoot } from "svenjs";
import { VerifyPanel } from "./verify-panel";
import { LibraryView } from "./library-view";
import { PublishFlow } from "./publish/flow";
import { KeyForm } from "./key-form";
import { RecordPage } from "@/pages/record";
import { wallet, lockWallet } from "@/stores/wallet";
import { endUpload } from "@/stores/upload";
import * as network from "@/lib/arweave";
import * as hashing from "@/lib/hash";
import { registeredRecord } from "@/lib/registry";
import { deferred, id, key, record } from "@/test/helpers";
vi.mock("@/lib/arweave", async (original) => ({ ...await original<typeof network>(), getRecord: vi.fn(), fetchPublishedBytes: vi.fn(), listForeverfiles: vi.fn(), getBalance: vi.fn(), quotePrice: vi.fn(), addressFromJwk: vi.fn() }));
vi.mock("@/lib/hash", async (original) => ({ ...await original<typeof hashing>(), sha256Blob: vi.fn(), sha256Hex: vi.fn() }));
vi.mock("@/lib/registry", () => ({ registeredRecord: vi.fn() }));
let root: HTMLElement;
const settle = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); flushSync(); } };
function input(selector: string, value: string) { const el = root.querySelector<HTMLInputElement>(selector)!; el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); flushSync(); }
function choose(file: File) { const el = root.querySelector<HTMLInputElement>('input[type="file"]')!; Object.defineProperty(el, "files", { configurable: true, value: [file] }); el.dispatchEvent(new Event("change", { bubbles: true })); flushSync(); }
function submit() { root.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); flushSync(); }
function click(text: string) { const button = Array.from(root.querySelectorAll("button")).find(b => b.textContent?.includes(text)); expect(button, text).toBeTruthy(); button!.click(); flushSync(); }
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(registeredRecord).mockRejectedValue(new Error("Not registered"));
  lockWallet(); endUpload(); history.replaceState({}, "", "/publish");
  root = document.createElement("div"); document.body.append(root);
  vi.mocked(network.getRecord).mockResolvedValue({ kind: "found", record });
  vi.mocked(network.fetchPublishedBytes).mockResolvedValue(new Uint8Array([1]).buffer);
  vi.mocked(hashing.sha256Blob).mockResolvedValue("a".repeat(64));
  vi.mocked(hashing.sha256Hex).mockResolvedValue("a".repeat(64));
  vi.mocked(network.quotePrice).mockResolvedValue({ ar: "1", winston: "1" });
  vi.mocked(network.getBalance).mockResolvedValue({ ar: "2", winston: "2" });
});
afterEach(() => { unmountRoot(root); root.remove(); lockWallet(); endUpload(); });
it.each([null, "a".repeat(64)])("verifies actual bytes including legacy hash %s", async (sha256) => {
  vi.mocked(network.getRecord).mockResolvedValue({ kind: "found", record: { ...record, sha256 } });
  render(<VerifyPanel initialRecord={id} />, root); choose(new File(["x"], "x.txt")); submit(); await settle();
  expect(network.fetchPublishedBytes).toHaveBeenCalled(); expect(root.textContent).toContain("Exactly the file");
});
it("rejects forged hash tags and differing bytes", async () => {
  vi.mocked(network.getRecord).mockResolvedValue({ kind: "found", record: { ...record, sha256: "a".repeat(64) } });
  vi.mocked(hashing.sha256Hex).mockResolvedValue("b".repeat(64));
  render(<VerifyPanel initialRecord={id} />, root); choose(new File(["x"], "x.txt")); submit(); await settle();
  expect(root.textContent).not.toContain("Exactly the file");
  vi.mocked(network.getRecord).mockResolvedValue({ kind: "found", record }); submit(); await settle();
  expect(root.textContent).toContain("does not match");
});
it("refuses oversized local files before reading and still permits metadata-only lookup", async () => {
  render(<VerifyPanel initialRecord={id} />, root);
  const file = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "large");
  choose(file); submit(); await settle();
  expect(network.getRecord).toHaveBeenCalledTimes(1);
  expect(root.textContent).toContain("original.txt");
  expect(root.textContent).toContain("25 MiB");
  expect(hashing.sha256Blob).not.toHaveBeenCalled();
  expect(network.fetchPublishedBytes).not.toHaveBeenCalled();
  // The retained oversized file must not prevent subsequent metadata lookups.
  vi.mocked(network.getRecord).mockResolvedValueOnce({ kind: "found", record: { ...record, id: "b".repeat(43), name: "second.txt" } });
  input("#verify-link", "b".repeat(43)); submit(); await settle();
  expect(root.textContent).toContain("second.txt");
  expect(root.textContent).not.toContain("original.txt");
  expect(hashing.sha256Blob).not.toHaveBeenCalled();
  expect(network.fetchPublishedBytes).not.toHaveBeenCalled();
  unmountRoot(root); render(<VerifyPanel initialRecord={id} />, root);
  vi.mocked(network.getRecord).mockResolvedValue({ kind: "found", record: { ...record, size: 100_000_000 } });
  submit(); await settle(); expect(root.textContent).toContain("original.txt"); expect(network.fetchPublishedBytes).not.toHaveBeenCalled();
});
it.each(["lookup", "hash", "download"])("invalidates input during %s, including stale failures", async (phase) => {
  const work = deferred<any>();
  if (phase === "lookup") vi.mocked(network.getRecord).mockReturnValueOnce(work.promise);
  if (phase === "hash") vi.mocked(hashing.sha256Blob).mockReturnValueOnce(work.promise);
  if (phase === "download") vi.mocked(network.fetchPublishedBytes).mockReturnValueOnce(work.promise);
  render(<VerifyPanel initialRecord={id} />, root); choose(new File(["x"], "x.txt")); submit(); await settle();
  input("#verify-link", "b".repeat(43)); work.reject(new Error("obsolete failure")); await settle();
  expect(root.textContent).not.toContain("obsolete failure"); expect(root.textContent).not.toContain("Exactly the file");
  submit(); await settle(); expect(root.textContent).toContain("Exactly the file");
  choose(new File(["y"], "y.txt")); expect(root.textContent).not.toContain("Exactly the file");
});
it.each(["lookup", "hash", "download"])("invalidates unmounted verification during %s", async (phase) => {
  const work = deferred<any>();
  if (phase === "lookup") vi.mocked(network.getRecord).mockReturnValueOnce(work.promise);
  if (phase === "hash") vi.mocked(hashing.sha256Blob).mockReturnValueOnce(work.promise);
  if (phase === "download") vi.mocked(network.fetchPublishedBytes).mockReturnValueOnce(work.promise);
  render(<VerifyPanel initialRecord={id} />, root); choose(new File(["x"], "x.txt")); submit(); await settle();
  const signal = vi.mocked(network.getRecord).mock.calls[0][1]!;
  unmountRoot(root); work.reject(new Error("old failure")); await settle(); expect(signal.aborted).toBe(true); expect(root.textContent).toBe("");
});
it("invalidates changed props, including an empty initial link", async () => {
  const Harness = create({ initialState: { link: id }, render() { return <><button onClick={() => this.setState({ link: "" })}>Clear prop</button><VerifyPanel initialRecord={this.state.link} /></>; } });
  render(<Harness />, root); choose(new File(["x"], "x")); submit(); await settle(); expect(root.textContent).toContain("Exactly the file"); click("Clear prop"); await settle(); expect(root.textContent).not.toContain("Exactly the file"); expect(root.querySelector<HTMLInputElement>("#verify-link")!.value).toBe("");
});
it("loads an already unlocked library and rejects previous wallet results", async () => {
  const old = deferred<network.LibraryPage>();
  vi.mocked(network.listForeverfiles).mockReturnValueOnce(old.promise).mockResolvedValueOnce({ records: [{ ...record, name: "new wallet" }], cursor: "next", hasNextPage: true }).mockRejectedValueOnce(new Error("page failed")).mockResolvedValueOnce({ records: [{ ...record, id: "b".repeat(43), name: "page two" }], cursor: "last", hasNextPage: false });
  wallet.set({ status: "unlocked", address: id, jwk: key }); render(<LibraryView />, root); await settle(); expect(network.listForeverfiles).toHaveBeenCalledTimes(1);
  wallet.set({ status: "unlocked", address: "b".repeat(43), jwk: key }); await settle(); old.resolve({ records: [record], cursor: null, hasNextPage: false }); await settle();
  expect(root.textContent).toContain("new wallet"); expect(root.textContent).not.toContain("original.txt");
  click("Load more"); await settle(); expect(root.textContent).toContain("page failed"); expect(root.textContent).toContain("new wallet");
  click("Try again"); await settle(); expect(root.textContent).toContain("page two");
});
it("preserves file/hash on price failure and retries fee and balance", async () => {
  vi.mocked(network.quotePrice).mockRejectedValueOnce(new Error("offline"));
  wallet.set({ status: "unlocked", address: id, jwk: key }); render(<PublishFlow />, root); await settle(); expect(network.getBalance).toHaveBeenCalledTimes(1);
  choose(new File(["x"], "retained.txt")); await settle(); expect(root.textContent).toContain("retained.txt"); expect(root.textContent).not.toContain("Could not compute");
  click("Refresh fee and balance"); await settle(); expect(network.quotePrice).toHaveBeenCalledTimes(2); expect(network.getBalance).toHaveBeenCalledTimes(2); expect(hashing.sha256Blob).toHaveBeenCalledTimes(1);
});
it("aborts key reads/unlocks on edits and unmount", async () => {
  const address = deferred<string>(); vi.mocked(network.addressFromJwk).mockReturnValue(address.promise);
  render(<KeyForm />, root); input("textarea", JSON.stringify(key)); submit(); unmountRoot(root); address.resolve(id); await settle(); expect(wallet.get().status).toBe("locked");
});
it("does not claim confirmation from new=1 and invalidates record lookup before bad IDs", async () => {
  const work = deferred<network.RecordResult>(); vi.mocked(network.getRecord).mockReturnValueOnce(work.promise);
  const Harness = create({ initialState: { id }, render() { return <><button onClick={() => this.setState({ id: "%" })}>Bad id</button><RecordPage params={{ id: this.state.id }} search="?new=1" /></>; } });
  render(<Harness />, root); click("Bad id"); document.title = "new page"; work.resolve({ kind: "found", record }); await settle(); expect(document.title).toBe("new page"); expect(root.textContent).not.toContain("original.txt");
  unmountRoot(root); vi.mocked(network.getRecord).mockResolvedValue({ kind: "found", record: { ...record, timestamp: null } }); render(<RecordPage params={{ id }} search="?new=1" />, root); await settle(); expect(root.textContent).not.toContain("Published and confirmed");
});
it("rejects stale balance success and failure after switching wallets", async () => {
  const old = deferred<network.Amount>();
  vi.mocked(network.getBalance).mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ar: "5", winston: "5" });
  wallet.set({ status: "unlocked", address: id, jwk: key }); render(<PublishFlow />, root); await settle();
  wallet.set({ status: "unlocked", address: "b".repeat(43), jwk: key }); await settle();
  old.reject(new Error("stale balance failure")); await settle(); expect(root.textContent).not.toContain("Balance unavailable");
  const stale = deferred<network.Amount>(); vi.mocked(network.getBalance).mockReturnValueOnce(stale.promise);
  wallet.set({ status: "unlocked", address: "c".repeat(43), jwk: key }); await settle(); lockWallet(); await settle();
  stale.resolve({ ar: "0", winston: "0" }); await settle(); expect(root.textContent).not.toContain("Balance unavailable");
});
it("keeps publishing errors visible in the authorization step", async () => {
  render(<PublishFlow />, root); choose(new File(["x"], "x.txt")); await settle(); click("Continue");
  for (const box of root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) { box.checked = true; box.dispatchEvent(new Event("change", { bubbles: true })); flushSync(); }
  click("Publish publicly"); await settle();
  wallet.set({ status: "unlocked", address: id, jwk: key }); await settle();
  vi.mocked(network.getBalance).mockRejectedValueOnce(new Error("simulated signing preparation failure"));
  // Prevent the actual SDK from issuing requests; this is a preparation failure.
  const client = network.getArweave();
  const init = vi.spyOn(network, "createArweave").mockReturnValue(client);
  const createTx = vi.spyOn(client, "createTransaction").mockRejectedValueOnce(new Error("simulated preparation failure"));
  click("Publish publicly"); await settle();
  expect(root.textContent).toContain("simulated preparation failure"); expect(root.textContent).toContain("Authorize");
  createTx.mockRestore(); init.mockRestore();
});

it("shows a shared saved receipt when Arweave is unavailable", async () => {
  vi.mocked(registeredRecord).mockResolvedValue({ ...record, timestamp: null });
  vi.mocked(network.getRecord).mockRejectedValue(new Error("Gateway offline"));
  render(<RecordPage params={{ id }} search="" />, root); await settle();
  expect(root.textContent).toContain(record.name);
  expect(root.textContent).toContain("Gateway offline");
  expect(root.textContent).toContain("Pending network time");
  expect(root.textContent).not.toContain("Published and confirmed");
});
