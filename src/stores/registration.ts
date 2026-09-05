import { createStore } from "svenjs";
import { isRecordId } from "@/lib/record";
import { registerRecord } from "@/lib/registry";

const STORAGE_KEY = "foreverfile:pending-registration:v1";
const ids = new Set<string>();
let running = false;
export const registration = createStore({ state: { pending: 0, working: false, error: null as string | null } });
function restore() {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(stored)) for (const id of stored) if (typeof id === "string" && isRecordId(id)) ids.add(id);
  } catch { /* Memory-only retry remains available when storage is disabled. */ }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch { /* Keep in memory. */ }
}
/** Only public IDs are persisted, never a file, key, or signed transaction. */
export function queueRegistration(id: string) {
  if (!isRecordId(id)) return;
  restore();
  ids.add(id);
  persist();
  registration.set({ ...registration.get(), pending: ids.size });
  void syncRegistrations();
}
export async function syncRegistrations() {
  if (running) return;
  restore();
  running = true;
  registration.set({ pending: ids.size, working: ids.size > 0, error: null });
  let error: string | null = null;
  try {
    // Drain newly queued IDs too, but never retry the same failed ID in a loop.
    const attempted = new Set<string>();
    while (true) {
      const id = [...ids].find(id => !attempted.has(id));
      if (!id) break;
      attempted.add(id);
      try {
        await registerRecord(id);
        ids.delete(id);
        persist();
      } catch {
        error = "Your file was uploaded, but its public listing could not be saved. Retry registration; this will not upload or charge again.";
      }
    }
  } finally {
    running = false;
    registration.set({ pending: ids.size, working: false, error });
  }
}
