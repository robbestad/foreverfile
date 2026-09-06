// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { create, flushSync, render, unmountRoot } from "svenjs";
import { RecordPage } from "./record";
import { getRecord, type RecordResult } from "@/lib/arweave";
import { registeredRecord } from "@/lib/registry";
import { deferred, id, record } from "@/test/helpers";

vi.mock("@/lib/arweave", () => ({ getRecord: vi.fn() }));
vi.mock("@/lib/registry", () => ({ registeredRecord: vi.fn() }));
vi.mock("@/stores/upload", () => ({ localReceipt: () => null }));
let root: HTMLElement;
const pending = { ...record, timestamp: null };
const settle = async () => {
  for (let i = 0; i < 12; i++) { await Promise.resolve(); flushSync(); }
};
const tick = async () => { await vi.advanceTimersByTimeAsync(15_000); await settle(); };
const click = (label: string) => {
  const button = [...root.querySelectorAll("button")].find(b => b.textContent?.includes(label));
  expect(button).toBeTruthy(); button!.click(); flushSync();
};
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.mocked(registeredRecord).mockRejectedValue(new Error("No receipt"));
  vi.mocked(getRecord).mockResolvedValue({ kind: "found", record: pending });
  root = document.createElement("div"); document.body.append(root);
});
afterEach(() => {
  unmountRoot(root); root.remove(); vi.useRealTimers(); vi.restoreAllMocks();
});
it("updates pending metadata to confirmed without hiding it or overlapping manual checks", async () => {
  const lookup = deferred<RecordResult>();
  vi.mocked(getRecord).mockResolvedValueOnce({ kind: "found", record: pending }).mockReturnValueOnce(lookup.promise);
  render(<RecordPage params={{ id }} search="?new=1" />, root); await settle();
  expect(root.textContent).toContain("Pending network time");
  await tick();
  expect(root.textContent).toContain(record.name);
  expect(root.textContent).not.toContain("Looking up the record");
  click("Check network status"); await tick();
  expect(getRecord).toHaveBeenCalledTimes(2);
  lookup.resolve({ kind: "found", record }); await settle();
  expect(root.textContent).toContain("Published and confirmed");
  expect(root.textContent).not.toContain("Pending network time");
  await tick(); expect(getRecord).toHaveBeenCalledTimes(2);
});
it("keeps polling a pending transaction through a transient error and missing gateway result", async () => {
  vi.mocked(getRecord).mockResolvedValueOnce({ kind: "pending" })
    .mockResolvedValueOnce({ kind: "not-found" }).mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce({ kind: "found", record });
  render(<RecordPage params={{ id }} search="" />, root); await settle();
  expect(root.textContent).toContain("Publication pending");
  await tick(); expect(root.textContent).toContain("Publication pending");
  await tick(); expect(root.textContent).toContain("Offline");
  await tick(); expect(root.textContent).toContain(record.name);
  expect(root.textContent).not.toContain("Offline");
  await tick(); expect(getRecord).toHaveBeenCalledTimes(4);
});
it("retains saved metadata through failures and allows immediate manual retry", async () => {
  vi.mocked(registeredRecord).mockResolvedValue(pending);
  vi.mocked(getRecord).mockRejectedValueOnce(new Error("Offline"))
    .mockRejectedValueOnce(new Error("Still offline")).mockResolvedValueOnce({ kind: "found", record });
  render(<RecordPage params={{ id }} search="" />, root); await settle();
  await tick(); expect(root.textContent).toContain(record.name);
  expect(root.textContent).toContain("Still offline");
  click("Check network status"); await settle();
  expect(root.textContent).not.toContain("Still offline");
  await tick(); expect(getRecord).toHaveBeenCalledTimes(3);
});
it("pauses in a hidden tab and resumes on visibility or page restoration", async () => {
  render(<RecordPage params={{ id }} search="" />, root); await settle();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange")); await tick();
  window.dispatchEvent(new Event("pageshow")); await settle();
  expect(getRecord).toHaveBeenCalledTimes(1);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange")); await settle();
  expect(getRecord).toHaveBeenCalledTimes(2);
  window.dispatchEvent(new Event("pageshow")); await settle();
  expect(getRecord).toHaveBeenCalledTimes(3);
  unmountRoot(root);
  document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("pageshow"));
  await tick(); expect(getRecord).toHaveBeenCalledTimes(3);
});
it.each(["resolve", "reject"])("aborts old IDs and ignores stale %s results", async (outcome) => {
  const old = deferred<RecordResult>();
  const nextId = "b".repeat(43);
  vi.mocked(getRecord).mockResolvedValueOnce({ kind: "found", record: pending })
    .mockReturnValueOnce(old.promise).mockResolvedValueOnce({ kind: "found", record: { ...record, id: nextId, name: "next.txt" } });
  const Harness = create({ initialState: { id }, render() {
    return <><button onClick={() => this.setState({ id: nextId })}>Next</button><RecordPage params={{ id: this.state.id }} search="" /></>;
  } });
  render(<Harness />, root); await settle(); await tick();
  const signal = vi.mocked(getRecord).mock.calls[1][1]!;
  click("Next"); await settle(); expect(signal.aborted).toBe(true);
  if (outcome === "resolve") old.resolve({ kind: "found", record });
  else old.reject(new Error("Stale error"));
  await settle(); await tick();
  expect(root.textContent).toContain("next.txt");
  expect(document.title).toContain("next.txt");
  expect(root.textContent).not.toContain("Stale error");
  expect(getRecord).toHaveBeenCalledTimes(3);
});
it("aborts an in-flight poll on unmount and never schedules another", async () => {
  const lookup = deferred<RecordResult>();
  vi.mocked(getRecord).mockResolvedValueOnce({ kind: "found", record: pending }).mockReturnValueOnce(lookup.promise);
  render(<RecordPage params={{ id }} search="" />, root); await settle(); await tick();
  const signal = vi.mocked(getRecord).mock.calls[1][1]!;
  unmountRoot(root); expect(signal.aborted).toBe(true); document.title = "Another page";
  lookup.resolve({ kind: "found", record }); await settle(); await tick();
  expect(document.title).toBe("Another page"); expect(getRecord).toHaveBeenCalledTimes(2);
});
it("does not poll confirmed, missing, or invalid records", async () => {
  for (const result of [{ kind: "found", record }, { kind: "not-found" }] as RecordResult[]) {
    vi.mocked(getRecord).mockResolvedValueOnce(result);
    render(<RecordPage params={{ id }} search="" />, root); await settle();
    const count = vi.mocked(getRecord).mock.calls.length;
    await tick(); expect(getRecord).toHaveBeenCalledTimes(count); unmountRoot(root);
  }
  render(<RecordPage params={{ id: "%" }} search="" />, root); await settle(); await tick();
  expect(getRecord).toHaveBeenCalledTimes(2);
});
