import { describe, expect, it } from "vitest";
import { assertArweaveJwk, parseArweaveJwk } from "./jwk";

const validKey = {
  kty: "RSA",
  n: "n-value",
  e: "AQAB",
  d: "d-value",
  p: "p-value",
  q: "q-value",
  dp: "dp-value",
  dq: "dq-value",
  qi: "qi-value",
};

describe("parseArweaveJwk", () => {
  it("accepts a complete RSA JWK", () => {
    expect(parseArweaveJwk(JSON.stringify(validKey))).toEqual(validKey);
  });

  it("strips a leading BOM and whitespace", () => {
    expect(parseArweaveJwk(`\uFEFF  ${JSON.stringify(validKey)}  `)).toEqual(
      validKey,
    );
  });

  it("ignores extra fields", () => {
    const parsed = parseArweaveJwk(
      JSON.stringify({ ...validKey, kid: "extra" }),
    );
    expect(parsed).toEqual(validKey);
  });

  it("rejects empty input", () => {
    expect(() => parseArweaveJwk("   ")).toThrow(/Paste your Arweave key/);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseArweaveJwk("{not json")).toThrow(/valid JSON/);
  });

  it("rejects arrays", () => {
    expect(() => parseArweaveJwk("[]")).toThrow(/JSON object/);
  });

  it("rejects a non-RSA key", () => {
    expect(() =>
      parseArweaveJwk(JSON.stringify({ ...validKey, kty: "EC" })),
    ).toThrow(/RSA/);
  });

  it("rejects a public-only JWK", () => {
    expect(() =>
      parseArweaveJwk(JSON.stringify({ ...validKey, d: undefined })),
    ).toThrow(/"d"/);
  });
});

describe("assertArweaveJwk", () => {
  it("rejects missing string fields", () => {
    expect(() => assertArweaveJwk({ ...validKey, n: "" })).toThrow(/"n"/);
    expect(() => assertArweaveJwk({ ...validKey, p: 1 })).toThrow(/"p"/);
  });

  it("rejects null", () => {
    expect(() => assertArweaveJwk(null)).toThrow(/JSON object/);
  });
});
