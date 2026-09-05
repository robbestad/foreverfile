import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the registry database before running this migration.");
const sql = neon(process.env.DATABASE_URL);
const migration = await readFile(new URL("../database/001_registry.sql", import.meta.url), "utf8");
const statements = migration.split(";").map(text => text.trim()).filter(Boolean);
await sql.transaction(statements.map(text => sql.query(text)), { fetchOptions: { signal: AbortSignal.timeout(20_000) } });
console.log("Registry schema is ready.");
