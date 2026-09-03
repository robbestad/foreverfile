import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(appRoot, "dist");
const serverRoot = resolve(appRoot, ".vite/prerender");
const serverEntry = resolve(serverRoot, "entry-server.js");
const headPattern = /<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/;
const bodyMarker = "<!--app-html-->";

function xml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function routeFile(pathname) {
  if (pathname === "/") return resolve(outputRoot, "index.html");
  return resolve(outputRoot, pathname.slice(1), "index.html");
}

const buildDay = new Date().toISOString().slice(0, 10);

async function writeRoute(template, pathname, renderPath, destination = routeFile(pathname)) {
  const result = await renderPath(pathname);
  const { head, html } = result;
  const page = template.replace(headPattern, head).replace(bodyMarker, html);
  if (page === template || page.includes(bodyMarker) || headPattern.test(page)) {
    throw new Error(`Could not inject prerendered output for ${pathname}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, page);
  return result;
}

try {
  const template = await readFile(resolve(outputRoot, "index.html"), "utf8");
  if (!headPattern.test(template) || !template.includes(bodyMarker)) {
    throw new Error("Built index.html is missing prerender markers");
  }

  const server = await import(pathToFileURL(serverEntry).href);
  const canonicalUrls = new Map();

  for (const pathname of server.staticPaths) {
    const { metadata } = await writeRoute(template, pathname, server.renderPath);
    if (!metadata.noIndex) {
      const canonicalPath = metadata.canonicalPath ?? metadata.path;
      const href = new URL(canonicalPath === "/" ? "/" : canonicalPath, server.SITE_ORIGIN).href;
      if (!canonicalUrls.has(href)) canonicalUrls.set(href, buildDay);
    }
  }

  await writeRoute(template, "/404", server.renderPath, resolve(outputRoot, "404.html"));

  await writeRoute(
    template,
    `/f/${server.RECORD_SHELL_ID}`,
    server.renderPath,
    resolve(outputRoot, "f", "index.html"),
  );

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...[...canonicalUrls].map(
      ([url, lastmod]) => `  <url><loc>${xml(url)}</loc><lastmod>${lastmod}</lastmod></url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");
  await writeFile(resolve(outputRoot, "sitemap.xml"), sitemap);

  const robots = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${new URL("/sitemap.xml", server.SITE_ORIGIN).href}`,
    "",
  ].join("\n");
  await writeFile(resolve(outputRoot, "robots.txt"), robots);

  console.log(`Prerendered ${server.staticPaths.length} routes for ${server.SITE_ORIGIN}`);
} finally {
  await rm(serverRoot, { recursive: true, force: true });
}
