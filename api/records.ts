import { getRecord, recentForeverfiles } from "../src/lib/arweave.js";
import { connectRegistry } from "../server/postgres-registry.js";
import { createRegistry } from "../server/registry.js";
import { registryHandler } from "../server/registry-handler.js";

export default {
  async fetch(request: Request) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return Response.json({ error: "The public registry has not been configured yet." }, { status: 503 });
    }
    const store = connectRegistry(connectionString);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(8_000)]);
    const lookup = (id: string) => getRecord(id, signal);
    return registryHandler(createRegistry(store, lookup, () => recentForeverfiles(signal)))(request);
  },
};
