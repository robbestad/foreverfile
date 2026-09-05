// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushSync, render, renderToString, unmountRoot } from "svenjs";
import { RecentRecords } from "./recent-records";
import { recentForeverfiles } from "@/lib/arweave";
import { deferred, id, record } from "@/test/helpers";
vi.mock("@/lib/arweave", () => ({ GATEWAY_URL: "https://arweave.net", recentForeverfiles: vi.fn() }));
let root: HTMLElement;
const settle = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); flushSync(); } };
beforeEach(() => { vi.resetAllMocks(); root = document.createElement("div"); document.body.append(root); });
afterEach(() => { unmountRoot(root); root.remove(); });
it("renders network metadata with actual record and gateway links, without claiming verification", async () => {
  vi.mocked(recentForeverfiles).mockResolvedValue([record, { ...record, id: "b".repeat(43), name: "waiting.txt", timestamp: null }]);
  render(<RecentRecords />, root); await settle();
  expect(root.querySelector(`a[href="/f/${id}"]`)?.textContent).toContain(record.name);
  expect(root.querySelector(`a[href="https://arweave.net/${id}"]`)).not.toBeNull();
  expect(root.textContent).toContain("Public");
  expect(root.textContent).toContain("Pending");
  expect(root.textContent).not.toContain("Verified");
});
it("shows an honest empty state and no fictional records", async () => {
  vi.mocked(recentForeverfiles).mockResolvedValue([]);
  render(<RecentRecords />, root); await settle();
  expect(root.textContent).toContain("No public ForeverFile records are indexed yet");
  expect(root.querySelector("a")).toBeNull();
});
it("supports retry after a network error", async () => {
  vi.mocked(recentForeverfiles).mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce([record]);
  render(<RecentRecords />, root); await settle();
  expect(root.querySelector('[role="alert"]')?.textContent).toContain("Network unavailable");
  root.querySelector("button")!.click(); await settle();
  expect(root.textContent).toContain(record.name);
  expect(root.querySelector('[role="alert"]')).toBeNull();
});
it("aborts on unmount and does not fetch during prerendering", async () => {
  const pending = deferred<typeof record[]>();
  vi.mocked(recentForeverfiles).mockReturnValue(pending.promise);
  expect(renderToString(<RecentRecords />)).toContain("Looking up public records");
  expect(recentForeverfiles).not.toHaveBeenCalled();
  render(<RecentRecords />, root);
  const signal = vi.mocked(recentForeverfiles).mock.calls[0][0]!;
  unmountRoot(root); pending.resolve([record]); await settle();
  expect(signal.aborted).toBe(true);
  expect(root.textContent).toBe("");
});
