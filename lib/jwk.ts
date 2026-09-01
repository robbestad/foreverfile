export const JWK_FIELDS = [
  "kty",
  "n",
  "e",
  "d",
  "p",
  "q",
  "dp",
  "dq",
  "qi",
] as const;

export type ArweaveJwk = {
  kty: "RSA";
  n: string;
  e: string;
  d: string;
  p: string;
  q: string;
  dp: string;
  dq: string;
  qi: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertArweaveJwk(value: unknown): ArweaveJwk {
  if (!isRecord(value)) {
    throw new Error("Key must be a JSON object.");
  }

  if (value.kty !== "RSA") {
    throw new Error('Key must be an RSA JSON Web Key (kty: "RSA").');
  }

  for (const field of JWK_FIELDS) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || fieldValue.length === 0) {
      throw new Error(`Key is missing required field "${field}".`);
    }
  }

  return {
    kty: "RSA",
    n: value.n as string,
    e: value.e as string,
    d: value.d as string,
    p: value.p as string,
    q: value.q as string,
    dp: value.dp as string,
    dq: value.dq as string,
    qi: value.qi as string,
  };
}

export function parseArweaveJwk(input: string): ArweaveJwk {
  const trimmed = input.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    throw new Error("Paste your Arweave key or choose a wallet.json file.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Key must be valid JSON.");
  }

  return assertArweaveJwk(parsed);
}
