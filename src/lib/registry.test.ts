import { afterEach, expect, it, vi } from "vitest";
import { registerRecord, registeredRecords, registeredRecord } from "./registry";
import { id, record } from "@/test/helpers";
afterEach(() => vi.unstubAllGlobals());
it("registers only the public ID and accepts a durably queued response", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ kind: "pending" }, { status: 202 }));
  vi.stubGlobal("fetch", fetch);
  await registerRecord(id);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ id });
});
it("filters malformed catalog entries and rejects wrong individual IDs", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ records: [null, record, { ...record, sha256: "bad" }] })).mockResolvedValueOnce(Response.json({ record })));
  expect(await registeredRecords()).toEqual([record]);
  await expect(registeredRecord("b".repeat(43))).rejects.toThrow("different record");
});
it("does not treat HTML fallback or a failed response as a saved registration", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("<html>" )).mockResolvedValueOnce(new Response("error", { status: 503 })));
  await expect(registerRecord(id)).rejects.toThrow();
  await expect(registerRecord(id)).rejects.toThrow("registry");
});
