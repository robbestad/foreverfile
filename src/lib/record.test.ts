import { describe, expect, it } from "vitest";
import {
  foreverFileDisplayUrl,
  foreverFileUrl,
  isRecordId,
  parseRecordId,
  recordFromNetwork,
  recordPath,
} from "./record";

const ID = "7Kx9m2QpL0vN4wR8tYcB3jHfA6uZsXe1DgMkPqwXY12";

describe("isRecordId", () => {
  it("accepts a 43-character base64url id", () => {
    expect(isRecordId(ID)).toBe(true);
  });

  it("rejects short or punctuated values", () => {
    expect(isRecordId("abc")).toBe(false);
    expect(isRecordId(`${ID}!`)).toBe(false);
  });
});

describe("parseRecordId", () => {
  it("accepts a raw id", () => {
    expect(parseRecordId(`  ${ID}  `)).toBe(ID);
  });

  it("parses ForeverFile record URLs", () => {
    expect(parseRecordId(`https://foreverfile.xyz/f/${ID}`)).toBe(ID);
    expect(parseRecordId(`http://localhost:3000/f/${ID}/`)).toBe(ID);
  });

  it("parses gateway and ar:// locators", () => {
    expect(parseRecordId(`https://arweave.net/${ID}`)).toBe(ID);
    expect(parseRecordId(`ar://${ID}`)).toBe(ID);
  });

  it("returns null for unrelated input", () => {
    expect(parseRecordId("https://example.com/f/nope")).toBeNull();
    expect(parseRecordId("not a link")).toBeNull();
    expect(parseRecordId("")).toBeNull();
  });
});

describe("record URLs", () => {
  it("builds path, canonical, and display forms", () => {
    expect(recordPath(ID)).toBe(`/f/${ID}`);
    expect(foreverFileUrl(ID)).toBe(`https://foreverfile.xyz/f/${ID}`);
    expect(foreverFileDisplayUrl(ID, true)).toBe("foreverfile.xyz/f/7Kx9…Y12");
  });
});

describe("recordFromNetwork", () => {
  it("maps tags including file identity", () => {
    const record = recordFromNetwork({
      id: ID,
      size: 1400,
      timestamp: 1_755_129_600,
      tags: [
        { name: "File-Name", value: "family-history.pdf" },
        { name: "Content-Type", value: "application/pdf" },
        { name: "File-SHA256", value: "abc123" },
        { name: "App-Name", value: "foreverfile" },
      ],
    });
    expect(record.name).toBe("family-history.pdf");
    expect(record.sha256).toBe("abc123");
    expect(record.appName).toBe("foreverfile");
  });

  it("tolerates older records without a fingerprint tag", () => {
    const record = recordFromNetwork({
      id: ID,
      size: 12,
      timestamp: null,
      tags: [{ name: "File-Name", value: "note.txt" }],
    });
    expect(record.sha256).toBeNull();
    expect(record.timestamp).toBeNull();
    expect(record.name).toBe("note.txt");
  });

  it("falls back to the record id when the file name is missing", () => {
    const record = recordFromNetwork({ id: ID, size: 1, timestamp: null });
    expect(record.name).toBe(ID);
    expect(record.contentType).toBe("application/octet-stream");
  });
});
