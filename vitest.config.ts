import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic", jsxImportSource: "svenjs" },
  resolve: {
    alias: {
      "@": resolve(root, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["src/test/dom-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
  },
});
