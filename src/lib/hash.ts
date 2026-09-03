function toArrayBuffer(source: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (source instanceof ArrayBuffer) return source;
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy.buffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export async function sha256Hex(
  source: ArrayBuffer | Uint8Array,
): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(source),
  );
  return bufferToHex(digest);
}

export async function sha256Blob(file: Blob): Promise<string> {
  return sha256Hex(await file.arrayBuffer());
}

export function formatFileIdentity(hex: string, short = false): string {
  const clean = hex.replace(/^sha256:/i, "").toLowerCase();
  const value = short ? shortHash(clean) : clean;
  return `sha256: ${value}`;
}

export function shortHash(hex: string, size = 4): string {
  const clean = hex.replace(/^sha256:/i, "").replace(/\s/g, "");
  if (clean.length <= size * 4) return clean;
  return `${clean.slice(0, size * 2)}…${clean.slice(-size * 2)}`;
}

export function identitiesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.replace(/^sha256:/i, "").replace(/\s/g, "").toLowerCase() ===
    b.replace(/^sha256:/i, "").replace(/\s/g, "").toLowerCase()
  );
}
