import { describe, expect, it } from "vitest";
import {
  formatFileIdentity,
  identitiesMatch,
  sha256Hex,
  shortHash,
} from "./hash";

const ABC_SHA256 =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("sha256Hex", () => {
  it("hashes the NIST abc vector", async () => {
    const bytes = new TextEncoder().encode("abc");
    expect(await sha256Hex(bytes)).toBe(ABC_SHA256);
  });
});

describe("shortHash", () => {
  it("keeps both ends of the fingerprint", () => {
    expect(shortHash(ABC_SHA256)).toBe("ba7816bf…f20015ad");
  });

  it("strips a sha256 prefix", () => {
    expect(shortHash(`sha256:${ABC_SHA256}`)).toBe("ba7816bf…f20015ad");
  });
});

describe("formatFileIdentity", () => {
  it("formats the full fingerprint", () => {
    expect(formatFileIdentity(ABC_SHA256)).toBe(`sha256: ${ABC_SHA256}`);
  });

  it("formats a short fingerprint", () => {
    expect(formatFileIdentity(ABC_SHA256, true)).toBe("sha256: ba7816bf…f20015ad");
  });
});

describe("identitiesMatch", () => {
  it("matches ignoring prefix, case, and spaces", () => {
    expect(identitiesMatch(`sha256: ${ABC_SHA256}`, ABC_SHA256.toUpperCase())).toBe(
      true,
    );
  });

  it("rejects missing values", () => {
    expect(identitiesMatch(null, ABC_SHA256)).toBe(false);
    expect(identitiesMatch(ABC_SHA256, "")).toBe(false);
  });
});
