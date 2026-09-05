import { withDeadline, METADATA_TIMEOUT } from "./network";
import { isRecordId, type ForeverFileRecord } from "./record";

function parseRecord(value: unknown): ForeverFileRecord {
  const record = value as ForeverFileRecord | null;
  if (!record || !isRecordId(record.id) || typeof record.name !== "string" || typeof record.contentType !== "string" ||
      !Number.isSafeInteger(record.size) || record.size < 0 || record.appName !== "foreverfile" ||
      (record.timestamp !== null && (!Number.isSafeInteger(record.timestamp) || record.timestamp < 0)) ||
      (record.sha256 !== null && !/^[a-fA-F0-9]{64}$/.test(record.sha256))) {
    throw new Error("The registry returned invalid metadata.");
  }
  return record;
}
async function request(path: string, signal?: AbortSignal, init?: RequestInit) {
  return withDeadline(signal, METADATA_TIMEOUT, async (signal) => {
    const response = await fetch(path, { ...init, signal, cache: "no-store" });
    if (!response.ok) throw new Error("Could not reach the public registry. Please try again.");
    return response.json();
  });
}
export async function registerRecord(id: string, signal?: AbortSignal): Promise<void> {
  if (!isRecordId(id)) throw new Error("Invalid record ID.");
  const result = await request("/api/records", signal, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
  });
  if (result?.kind !== "found" && result?.kind !== "pending") throw new Error("The registry did not acknowledge this record.");
}
export async function registeredRecords(signal?: AbortSignal): Promise<ForeverFileRecord[]> {
  const result = await request("/api/records", signal);
  if (!Array.isArray(result?.records)) throw new Error("The registry returned invalid metadata.");
  return result.records.flatMap((record: unknown) => {
    try { return [parseRecord(record)]; } catch { return []; }
  });
}
export async function registeredRecord(id: string, signal?: AbortSignal): Promise<ForeverFileRecord> {
  const result = await request(`/api/records?id=${encodeURIComponent(id)}`, signal);
  const record = parseRecord(result?.record);
  if (record.id !== id) throw new Error("The registry returned a different record.");
  return record;
}
