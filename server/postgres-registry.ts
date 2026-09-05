import { neon } from "@neondatabase/serverless";
import type { ForeverFileRecord } from "../src/lib/record.js";
import type { RegistryStore } from "./registry.js";

export type Query = (text: string, values: unknown[]) => Promise<Record<string, any>[]>;
export function postgresRegistry(query: Query): RegistryStore {
  return {
    async save(id, record) {
      await query(`INSERT INTO foreverfile_records (id, record) VALUES ($1, $2::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          record = CASE
            WHEN EXCLUDED.record IS NULL THEN foreverfile_records.record
            WHEN EXCLUDED.record->>'timestamp' IS NULL AND foreverfile_records.record->>'timestamp' IS NOT NULL
              THEN jsonb_set(EXCLUDED.record, '{timestamp}', foreverfile_records.record->'timestamp')
            ELSE EXCLUDED.record END,
          checked_at = now()`,
        [id, record === null ? null : JSON.stringify(record)]);
    },
    async removePending(id) {
      // Preserve validated metadata if another request saved it concurrently.
      await query("DELETE FROM foreverfile_records WHERE id = $1 AND record IS NULL", [id]);
    },
    async find(id) {
      const rows = await query("SELECT record FROM foreverfile_records WHERE id = $1", [id]);
      return rows[0]?.record as ForeverFileRecord | null ?? null;
    },
    async recent() {
      const rows = await query("SELECT record FROM foreverfile_records WHERE record IS NOT NULL ORDER BY registered_at DESC, id DESC LIMIT 4", []);
      return rows.map(row => row.record as ForeverFileRecord);
    },
    async pending() {
      // Rotate retries atomically so one bad pending transaction cannot starve others.
      const rows = await query(`UPDATE foreverfile_records SET checked_at = now()
        WHERE id IN (SELECT id FROM foreverfile_records WHERE (record IS NULL OR record->>'timestamp' IS NULL)
          AND checked_at < now() - interval '30 seconds'
          ORDER BY checked_at ASC LIMIT 4 FOR UPDATE SKIP LOCKED) RETURNING id`, []);
      return rows.map(row => String(row.id));
    },
  };
}
export function connectRegistry(connectionString: string) {
  const sql = neon(connectionString);
  return postgresRegistry((text, values) => sql.query(text, values, {
    fetchOptions: { signal: AbortSignal.timeout(3_000) },
  }));
}
