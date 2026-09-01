import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  APP_VERSION,
  MAX_FILE_NAME_CHARS,
  buildTags,
  sanitizeFileName,
  tagValue,
} from "./tags";

describe("sanitizeFileName", () => {
  it("strips control characters", () => {
    expect(sanitizeFileName("a\nb\tfile.txt")).toBe("a b file.txt");
  });

  it("falls back when empty", () => {
    expect(sanitizeFileName("   ")).toBe("untitled");
  });

  it("truncates long names", () => {
    const name = `${"a".repeat(300)}.png`;
    expect(sanitizeFileName(name)).toHaveLength(MAX_FILE_NAME_CHARS);
  });
});

describe("buildTags", () => {
  it("sets app, file name, and content type", () => {
    const tags = buildTags({ name: "photo.png", type: "image/png" });
    expect(tagValue(tags, "App-Name")).toBe(APP_NAME);
    expect(tagValue(tags, "App-Version")).toBe(APP_VERSION);
    expect(tagValue(tags, "File-Name")).toBe("photo.png");
    expect(tagValue(tags, "Content-Type")).toBe("image/png");
  });

  it("defaults the content type", () => {
    const tags = buildTags({ name: "blob", type: "" });
    expect(tagValue(tags, "Content-Type")).toBe("application/octet-stream");
  });
});
