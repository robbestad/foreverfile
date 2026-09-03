import { describe, expect, it } from "vitest";
import {
  arProtocolUrl,
  arweaveUrl,
  formatBytes,
  formatPublishedDate,
  shortId,
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

describe("formatPublishedDate", () => {
  it("formats an en-GB long date", () => {
    expect(formatPublishedDate(Date.UTC(2026, 7, 14) / 1000)).toBe(
      "14 August 2026",
    );
  });

  it("labels a pending timestamp", () => {
    expect(formatPublishedDate(null)).toBe("Pending network time");
  });
});

describe("shortId", () => {
  it("keeps both ends of a record id", () => {
    expect(shortId("7Kx9m2QpL0vN4wR8tYcB3jHfA6uZsXe1DgMkPqwXY12")).toBe(
      "7Kx9…XY12",
    );
  });
});
