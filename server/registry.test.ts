import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { postgresRegistry } from "./postgres-registry";
import { createRegistry } from "./registry";
import { registryHandler } from "./registry-handler";
import { record, id } from "../src/test/helpers";
import type { RecordResult } from "../src/lib/arweave";
let db: PGlite;
let store: ReturnType<typeof postgresRegistry>;
const lookup = vi.fn<(id: string) => Promise<RecordResult>>();
beforeEach(async () => {
  db = new PGlite();
  await db.exec(await readFile(new URL("../database/001_registry.sql", import.meta.url), "utf8"));
  store = postgresRegistry(async (text, params) => (await db.query(text, params)).rows as Record<string, any>[]);
  lookup.mockReset().mockResolvedValue({ kind: "found", record });
});
afterEach(async () => { await db.close(); });
it("persists metadata independently of the service instance and upserts without duplication", async () => {
  await createRegistry(store, lookup).register(id);
  const next = createRegistry(store, lookup);
  lookup.mockRejectedValue(new Error("offline"));
  expect(await next.register(id)).toEqual({ kind: "found", record });
  expect(await next.find(id)).toEqual(record);
  expect(await next.recent()).toEqual([record]);
  const rows = await db.query("SELECT * FROM foreverfile_records");
  expect(rows.rows).toHaveLength(1);
});
it("saves pending IDs and later fills metadata without inventing confirmation", async () => {
  lookup.mockResolvedValueOnce({ kind: "pending" });
  const registry = createRegistry(store, lookup);
  await expect(registry.register(id)).resolves.toEqual({ kind: "pending" });
  expect(await store.find(id)).toBeNull();
  await db.exec("UPDATE foreverfile_records SET checked_at = now() - interval '1 minute'");
  lookup.mockResolvedValueOnce({ kind: "found", record: { ...record, timestamp: null } });
  expect(await registry.recent()).toEqual([{ ...record, timestamp: null }]);
  await db.exec("UPDATE foreverfile_records SET checked_at = now() - interval '1 minute'");
  expect(await registry.recent()).toEqual([record]);
  await store.save(id, { ...record, timestamp: null });
  expect((await store.find(id))?.timestamp).toBe(record.timestamp);
});
it("preserves saved records when discovery or one pending lookup fails", async () => {
  await store.save(id, record);
  await store.save("b".repeat(43), null);
  await db.exec("UPDATE foreverfile_records SET checked_at = now() - interval '1 minute'");
  lookup.mockRejectedValue(new Error("offline"));
  const registry = createRegistry(store, lookup, vi.fn().mockRejectedValue(new Error("offline")));
  expect(await registry.recent()).toEqual([record]);
});
it("rejects missing transactions and records from other apps", async () => {
  const registry = createRegistry(store, lookup);
  lookup.mockResolvedValueOnce({ kind: "not-found" });
  await expect(registry.register(id)).rejects.toMatchObject({ status: 404 });
  lookup.mockResolvedValueOnce({ kind: "found", record: { ...record, appName: "other" } });
  await expect(registry.register(id)).rejects.toMatchObject({ status: 422 });
  expect(await store.recent()).toEqual([]);
});
it("accepts only an ID and rejects client metadata, keys, files and oversized bodies", async () => {
  const handler = registryHandler(createRegistry(store, lookup));
  for (const body of [{ id, jwk: {} }, { id, name: "forged" }, { id, data: "bytes" }, { id: "invalid" }]) {
    const response = await handler(new Request("https://example.test/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
  }
  expect(lookup).not.toHaveBeenCalled();
  const large = await handler(new Request("https://example.test/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(129) }));
  expect(large.status).toBe(413);
  const saved = await handler(new Request("https://example.test/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }));
  expect(saved.status).toBe(200);
  const read = await handler(new Request(`https://example.test/api/records?id=${id}`));
  expect(await read.json()).toEqual({ record });
});
