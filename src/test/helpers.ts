export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export const key = { kty: "RSA" as const, n: "n-value", e: "AQAB", d: "d-value", p: "p-value", q: "q-value", dp: "dp-value", dq: "dq-value", qi: "qi-value" };
export const id = "a".repeat(43);
export const record = { id, name: "original.txt", contentType: "text/plain", size: 1, timestamp: 1700000000, sha256: null, appName: "foreverfile" };
