import { SITE_HOST, SITE_URL } from "./site.js";
import { APP_NAME, tagValue, type ArweaveTag } from "./tags.js";

export const RECORD_ID_PATTERN = /^[a-zA-Z0-9_-]{43}$/;

export type ForeverFileRecord = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  timestamp: number | null;
  sha256: string | null;
  appName: string | null;
};

export type StampKind =
  | "verified"
  | "public"
  | "unchanged"
  | "persistent"
  | "pending"
  | "published";

export function isRecordId(value: string): boolean {
  return RECORD_ID_PATTERN.test(value);
}

export function recordPath(id: string): string {
  return `/f/${id}`;
}

export function foreverFileUrl(id: string): string {
  return `${SITE_URL}${recordPath(id)}`;
}

export function foreverFileDisplayUrl(id: string, short = false): string {
  const suffix = short ? `${id.slice(0, 4)}…${id.slice(-3)}` : id;
  return `${SITE_HOST}/f/${suffix}`;
}

export function parseRecordId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isRecordId(trimmed)) return trimmed;

  const arProtocol = trimmed.match(/^ar:\/\/([a-zA-Z0-9_-]{43})\/?$/i);
  if (arProtocol) return arProtocol[1];

  try {
    const url = new URL(trimmed);
    const fromF = url.pathname.match(/\/f\/([a-zA-Z0-9_-]{43})\/?$/);
    if (fromF) return fromF[1];

    const host = url.hostname.replace(/^www\./, "");
    if (host === "arweave.net" || host.endsWith(".arweave.net")) {
      const id = url.pathname.replace(/^\//, "").split("/")[0] ?? "";
      if (isRecordId(id)) return id;
    }
  } catch {
    return null;
  }

  return null;
}

export function recordFromNetwork(input: {
  id: string;
  size: number;
  timestamp: number | null;
  tags?: ArweaveTag[];
}): ForeverFileRecord {
  return {
    id: input.id,
    name: tagValue(input.tags, "File-Name") ?? input.id,
    contentType: tagValue(input.tags, "Content-Type") ?? "application/octet-stream",
    size: input.size,
    timestamp: input.timestamp,
    sha256: tagValue(input.tags, "File-SHA256") ?? null,
    appName: tagValue(input.tags, "App-Name") ?? null,
  };
}

export function isForeverFileRecord(record: ForeverFileRecord): boolean {
  return record.appName === APP_NAME;
}
