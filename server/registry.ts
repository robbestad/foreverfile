import { isRecordId, type ForeverFileRecord } from "../src/lib/record.js";
import { APP_NAME } from "../src/lib/tags.js";
import type { RecordResult } from "../src/lib/arweave.js";

export interface RegistryStore {
  save(id: string, record: ForeverFileRecord | null): Promise<void>;
  find(id: string): Promise<ForeverFileRecord | null>;
  recent(): Promise<ForeverFileRecord[]>;
  pending(): Promise<string[]>;
}

export class RegistryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Lookup = (id: string, signal?: AbortSignal) => Promise<RecordResult>;

/** Only public network metadata enters the catalog; clients submit an ID alone. */
export function createRegistry(store: RegistryStore, lookup: Lookup, discover?: (signal?: AbortSignal) => Promise<ForeverFileRecord[]>) {
  async function register(id: string, signal?: AbortSignal) {
    if (!isRecordId(id)) throw new RegistryError(400, "Invalid record ID.");
    const cached = await store.find(id);
    if (cached?.timestamp != null) return { kind: "found", record: cached } as const;
    const result = await lookup(id, signal);
    if (result.kind === "not-found") throw new RegistryError(404, "The network has not received this transaction yet. Try again shortly.");
    if (result.kind === "pending") {
      await store.save(id, null);
      return { kind: "pending" } as const;
    }
    if (result.record.appName !== APP_NAME) throw new RegistryError(422, "This transaction was not published with ForeverFile.");
    await store.save(id, result.record);
    return result;
  }

  return {
    register,
    async find(id: string) {
      if (!isRecordId(id)) throw new RegistryError(400, "Invalid record ID.");
      return store.find(id);
    },
    async recent(signal?: AbortSignal) {
      // Pending IDs survive process restarts. One bad/unavailable transaction
      // cannot prevent already saved records from being returned.
      const pending = await store.pending();
      await Promise.allSettled([
        ...pending.map(id => register(id, signal)),
        ...(discover ? [discover(signal).then(records => Promise.all(records.filter(record => record.appName === APP_NAME).map(record => store.save(record.id, record))))] : []),
      ]);
      return store.recent();
    },
  };
}
