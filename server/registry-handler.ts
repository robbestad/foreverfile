import { createRegistry, RegistryError } from "./registry.js";

type Registry = ReturnType<typeof createRegistry>;
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export function registryHandler(registry: Registry) {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (request.method === "GET") {
        const id = url.searchParams.get("id");
        if (id !== null) {
          const record = await registry.find(id);
          return record ? json({ record }) : json({ error: "Record not registered." }, 404);
        }
        return json({ records: await registry.recent(request.signal) });
      }
      if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
      if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Expected JSON containing only an id." }, 415);
      // Bound actual body bytes as well as Content-Length. Never parse or store
      // files, JWKs, or client-supplied metadata on this endpoint.
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "Missing record ID." }, 400);
      let text = "";
      let size = 0;
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 128) return json({ error: "Only a record ID is accepted." }, 413);
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      let input: unknown;
      try { input = JSON.parse(text); } catch { return json({ error: "Invalid JSON." }, 400); }
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 || !("id" in input) || typeof input.id !== "string") {
        return json({ error: "Only a record ID is accepted." }, 400);
      }
      const result = await registry.register(input.id, request.signal);
      return json(result, result.kind === "pending" ? 202 : 200);
    } catch (error) {
      if (error instanceof RegistryError) return json({ error: error.message }, error.status);
      return json({ error: "The public registry is temporarily unavailable. Please try again." }, 503);
    }
  };
}
