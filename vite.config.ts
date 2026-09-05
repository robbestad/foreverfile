import tailwindcss from "@tailwindcss/vite";
import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

function isRecordPath(pathname: string) {
  return /^\/f\/[a-zA-Z0-9_-]{43}$/.test(pathname);
}

function pageFile(pathname: string) {
  if (pathname === "/index.html") pathname = "/";
  if (pathname !== "/" && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  if (isRecordPath(pathname)) return resolve(root, "dist", "f", "index.html");
  if (pathname === "/") return resolve(root, "dist", "index.html");
  if (pathname.startsWith("/assets/") || /\.[a-z0-9]+$/i.test(pathname)) {
    return null;
  }
  const nested = resolve(root, "dist", pathname.slice(1), "index.html");
  return existsSync(nested) ? nested : null;
}

function previewRoutes(): Plugin {
  return {
    name: "preview-routes",
    configurePreviewServer(server) {
      // Handle application entries before Vite tries to decode malformed paths.
      server.middlewares.use((req, res, next) => {
          if (res.headersSent) return next();
          const url = new URL(req.url ?? "/", "http://localhost");
          const file = pageFile(url.pathname);
          if (file) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            createReadStream(file).pipe(res);
            return;
          }
          if (/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.startsWith("/assets/")) {
            return next();
          }
          const dest = resolve(root, "dist", "404.html");
          if (!existsSync(dest)) return next();
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          createReadStream(dest).pipe(res);
      });
    },
  };
}

export default defineConfig(({ isSsrBuild, isPreview, command, mode }) => ({
  appType: isPreview || (command === "serve" && mode === "production") ? "mpa" : "spa",
  plugins: isSsrBuild ? [] : [tailwindcss(), previewRoutes()],
  esbuild: { jsx: "automatic", jsxImportSource: "svenjs" },
  resolve: {
    alias: {
      "@": resolve(root, "src"),
    },
  },
  optimizeDeps: {
    include: ["arweave"],
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 4173,
  },
  build: {
    target: "es2022",
    copyPublicDir: !isSsrBuild,
  },
}));
