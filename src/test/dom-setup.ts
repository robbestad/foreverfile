import { vi } from "vitest";
// Node's structuredClone cannot clone happy-dom's File implementation. Browsers
// support File natively; emulate that one case for SvenJS development-state tests.
if (typeof document !== "undefined") {
  const nativeClone = globalThis.structuredClone;
  const clone = (value: any): any => {
    if (value instanceof File) return new File([value], value.name, { type: value.type, lastModified: value.lastModified });
    if (Array.isArray(value)) return value.map(clone);
    if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
    return nativeClone(value);
  };
  vi.stubGlobal("structuredClone", clone);
}
