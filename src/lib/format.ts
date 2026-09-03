const WINSTON_PER_AR = BigInt("1000000000000");
const ZERO = BigInt(0);

export function truncateAddress(address: string, size = 6): string {
  if (address.length <= size * 2 + 1) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

export function winstonToAr(winston: string): string {
  const value = BigInt(winston);
  const negative = value < ZERO;
  const abs = negative ? -value : value;
  const whole = abs / WINSTON_PER_AR;
  const frac = abs % WINSTON_PER_AR;
  const fracStr = frac.toString().padStart(12, "0").replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return fracStr.length === 0
    ? `${sign}${whole.toString()}`
    : `${sign}${whole.toString()}.${fracStr}`;
}

export function formatAr(ar: string, digits = 6): string {
  const n = Number(ar);
  if (!Number.isFinite(n)) return ar;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatTimestamp(seconds: number | null): string {
  if (seconds == null) return "Pending";
  return new Date(seconds * 1000).toLocaleString();
}

export function formatPublishedDate(seconds: number | null): string {
  if (seconds == null) return "Pending network time";
  return new Date(seconds * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function arweaveUrl(id: string): string {
  return `https://arweave.net/${id}`;
}

export function arProtocolUrl(id: string): string {
  return `ar://${id}`;
}

export function shortId(id: string, size = 4): string {
  if (id.length <= size * 2 + 1) return id;
  return `${id.slice(0, size)}…${id.slice(-size)}`;
}

export function fileKind(contentType: string): string {
  if (contentType.startsWith("image/")) return "IMG";
  if (contentType.startsWith("audio/")) return "AUD";
  if (contentType.startsWith("video/")) return "VID";
  if (contentType.includes("pdf")) return "PDF";
  if (contentType.startsWith("text/")) return "TXT";
  return "FILE";
}
