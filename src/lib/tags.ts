export const APP_NAME = "foreverfile";
export const APP_VERSION = "2.0.0";
export const FILE_SIZE_WARN_BYTES = 25 * 1024 * 1024;
export const MAX_FILE_NAME_CHARS = 200;

export type ArweaveTag = {
  name: string;
  value: string;
};

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\r\n\t]+/g, " ").trim();
  if (!cleaned) return "untitled";
  return cleaned.length > MAX_FILE_NAME_CHARS
    ? cleaned.slice(0, MAX_FILE_NAME_CHARS)
    : cleaned;
}

export function buildTags(
  file: { name: string; type: string },
  sha256: string,
): ArweaveTag[] {
  return [
    {
      name: "Content-Type",
      value: file.type || "application/octet-stream",
    },
    { name: "File-Name", value: sanitizeFileName(file.name) },
    { name: "File-SHA256", value: sha256.toLowerCase() },
    { name: "App-Name", value: APP_NAME },
    { name: "App-Version", value: APP_VERSION },
  ];
}

export function tagValue(
  tags: ArweaveTag[] | undefined,
  name: string,
): string | undefined {
  return tags?.find((tag) => tag.name === name)?.value;
}
