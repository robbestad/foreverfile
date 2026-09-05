import { afterEach, describe, expect, it, vi } from "vitest";
import Arweave from "arweave";
import { recentForeverfiles, checkFileSize, createArweave, fetchPublishedBytes, getRecord, listForeverfiles, quotePrice, getBalance } from "./arweave";
import { FILE_SIZE_WARN_BYTES as MAX } from "./tags";
const id = "a".repeat(43);
const node = { id, data: { size: "1" }, tags: [], block: null };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("record network boundary", () => {
  it("distinguishes indexed, pending and absent records", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ data: { transaction: node } }))
      .mockResolvedValueOnce(json({ data: { transaction: null } })).mockResolvedValueOnce(new Response("Pending", { status: 202 }))
      .mockResolvedValueOnce(json({ data: { transaction: null } })).mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    expect((await getRecord(id)).kind).toBe("found");
    expect((await getRecord(id)).kind).toBe("pending");
    expect((await getRecord(id)).kind).toBe("not-found");
  });
  it.each(["offline", "503", "json"])("does not convert %s into absence", async (failure) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => failure === "offline" ? Promise.reject(new Error("offline")) : Promise.resolve(new Response("bad", { status: failure === "503" ? 503 : 200 }))).mockResolvedValueOnce(new Response(null, { status: 404 })));
    await expect(getRecord(id)).rejects.toThrow();
  });
  it.each([{ id: "b".repeat(43) }, { data: { size: "NaN" } }, { block: { timestamp: -1 } }, { tags: [{ name: "File-SHA256", value: "fake" }] }])("validates record fields %j", async (override) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ data: { transaction: { ...node, ...override } } })).mockResolvedValueOnce(new Response(null, { status: 404 })));
    await expect(getRecord(id)).rejects.toThrow("invalid record");
  });
  it("uses base64url Unicode tags in the fallback", async () => {
    const name = "Blåbær 日本語 🌿.txt";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ data: { transaction: null } })).mockResolvedValueOnce(json({ id, data_size: "1", tags: [{ name: Arweave.utils.stringToB64Url("File-Name"), value: Arweave.utils.stringToB64Url(name) }] })));
    const result = await getRecord(id);
    expect(result.kind === "found" && result.record.name).toBe(name);
  });
  it("paginates beyond 50", async () => {
    const fetch = vi.fn().mockImplementation((_url, init) => {
      const after = JSON.parse(init.body).variables.after;
      return Promise.resolve(json({ data: { transactions: { pageInfo: { hasNextPage: !after }, edges: Array.from({ length: after ? 1 : 50 }, (_, i) => ({ cursor: `cursor-${i}`, node })) } } }));
    });
    vi.stubGlobal("fetch", fetch);
    const first = await listForeverfiles(id);
    const second = await listForeverfiles(id, first.cursor);
    expect(first.records.length + second.records.length).toBe(51);
    expect(second.hasNextPage).toBe(false);
  });
});
describe("bounded byte transfers", () => {
  it("accepts exactly 25 MiB and refuses the next byte", () => {
    expect(() => checkFileSize(MAX)).not.toThrow();
    expect(() => checkFileSize(MAX + 1)).toThrow("25 MiB");
  });
  it.each([202, 206, 404, 503])("rejects HTTP %s as file bytes", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Pending", { status })));
    await expect(fetchPublishedBytes(id)).rejects.toThrow();
  });
  it("rejects metadata oversize before fetching", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(fetchPublishedBytes(id, undefined, MAX + 1)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("cancels a stream that exceeds the real byte limit", async () => {
    const cancel = vi.fn();
    let count = 0;
    const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(++count === 1 ? MAX : 1)); }, cancel });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    await expect(fetchPublishedBytes(id)).rejects.toThrow("25 MiB");
    expect(cancel).toHaveBeenCalled();
  });
  it("rejects declared oversize and truncated payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("x", { headers: { "content-length": String(MAX + 1) } })).mockResolvedValueOnce(new Response("x")));
    await expect(fetchPublishedBytes(id)).rejects.toThrow("25 MiB");
    await expect(fetchPublishedBytes(id, undefined, 2)).rejects.toThrow("size");
  });
  it("accepts full bytes at the exact boundary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array(MAX))));
    expect((await fetchPublishedBytes(id, undefined, MAX)).byteLength).toBe(MAX);
  });
});
it("aborts metadata, bytes and SDK calls at their deadlines without replacing fetch", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn((_url, init) => new Promise((_resolve, reject) => { init.signal.addEventListener("abort", () => reject(init.signal.reason)); }));
  vi.stubGlobal("fetch", fetch);
  for (const [run, duration] of [
    [() => quotePrice(1), 20000], [() => getBalance(id), 20000], [() => fetchPublishedBytes(id), 60000],
    [() => createArweave().api.post("chunk", {}), 60000],
  ] as const) {
    const result = expect(run()).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(duration);
    await result;
  }
  expect(globalThis.fetch).toBe(fetch);
});
it("aborts the body stream when the caller cancels a download", async () => {
  const controller = new AbortController();
  let streamController!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal("fetch", vi.fn((_url, init) => {
    init.signal.addEventListener("abort", () => streamController.error(init.signal.reason));
    return Promise.resolve(new Response(new ReadableStream({ start(c) { streamController = c; } })));
  }));
  const pending = expect(fetchPublishedBytes(id, controller.signal)).rejects.toThrow("cancelled");
  await Promise.resolve(); controller.abort(new Error("cancelled")); await pending;
});

it("loads recent public ForeverFile records without requiring a wallet", async () => {
  const fetch = vi.fn().mockResolvedValue(json({ data: { transactions: { edges: [{ node }] } } }));
  vi.stubGlobal("fetch", fetch);
  expect(await recentForeverfiles()).toEqual([expect.objectContaining({ id, size: 1 })]);
  const { query, variables } = JSON.parse(fetch.mock.calls[0][1].body);
  expect(query).toContain('values: ["foreverfile"]');
  expect(query).toContain("first: 4");
  expect(query).not.toContain("owners:");
  expect(variables).toEqual({});
});
