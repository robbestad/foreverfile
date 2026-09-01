import { describe, expect, it } from "vitest";
import {
  arProtocolUrl,
  arweaveUrl,
  formatBytes,
  truncateAddress,
  winstonToAr,
} from "./format";

describe("winstonToAr", () => {
  it("converts whole AR", () => {
    expect(winstonToAr("1000000000000")).toBe("1");
  });

  it("keeps fractional winston without trailing zeros", () => {
    expect(winstonToAr("1500000000000")).toBe("1.5");
  });

  it("handles zero", () => {
    expect(winstonToAr("0")).toBe("0");
  });
});

describe("formatBytes", () => {
  it("formats SI-ish binary units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.00 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});

describe("urls and address", () => {
  it("truncates long addresses", () => {
    const address = "abcdefghijklmnopqrstuvwxyz012345";
    expect(truncateAddress(address)).toBe("abcdef…012345");
  });

  it("builds gateway and ar:// urls", () => {
    expect(arweaveUrl("abc")).toBe("https://arweave.net/abc");
    expect(arProtocolUrl("abc")).toBe("ar://abc");
  });
});
