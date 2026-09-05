import { COPY } from "@/lib/copy";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { HomePage } from "@/pages/home";
import { HowPage } from "@/pages/how";
import { NotFoundPage } from "@/pages/not-found";
import type { Route } from "@/router";
import { matchRoute } from "@/router";

export { SITE_NAME };

const FALLBACK_ORIGIN = SITE_URL;

function configuredOrigin() {
  const value = import.meta.env.VITE_SITE_ORIGIN?.trim() || FALLBACK_ORIGIN;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("VITE_SITE_ORIGIN must be an http(s) URL");
  }
  return url.origin;
}

export const SITE_ORIGIN = configuredOrigin();
export const SOCIAL_IMAGE = new URL("/og.png", SITE_ORIGIN).href;
export const SOCIAL_IMAGE_ALT = `${COPY.name} — ${COPY.hero.title}`;

/** Dummy id used only to prerender the `/f/:id` loading shell. */
export const RECORD_SHELL_ID = "0".repeat(43);

export const routes: Route[] = [
  { path: "/", component: HomePage },
  { path: "/how", component: HowPage },
  {
    path: "/publish",
    load: () => import("@/pages/publish").then((m) => m.PublishPage),
  },
  {
    path: "/verify",
    load: () => import("@/pages/verify").then((m) => m.VerifyPage),
  },
  {
    path: "/library",
    load: () => import("@/pages/library").then((m) => m.LibraryPage),
  },
  {
    path: "/f/:id",
    load: () => import("@/pages/record").then((m) => m.RecordPage),
  },
];

export const staticPaths = ["/", "/how", "/publish", "/verify", "/library"];

export async function loadRoute(pathname: string) {
  const matched = matchRoute(pathname, routes);
  if (!matched) return null;
  if (!matched.route.component && matched.route.load) {
    matched.route.component = await matched.route.load();
  }
  return matched;
}

export type PageMetadata = {
  title: string;
  description: string;
  path: string;
  canonicalPath?: string;
  omitCanonical?: boolean;
  noIndex?: boolean;
  socialImage?: string;
  socialImageAlt?: string;
};

const pageMetadata: Record<
  string,
  Pick<PageMetadata, "title" | "description">
> = {
  "/": {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  "/how": {
    title: "How it works",
    description: COPY.how.lead,
  },
  "/publish": {
    title: "Publish a file",
    description:
      "Create a public ForeverFile record of an exact file. You will review the consequences before anything is written.",
  },
  "/verify": {
    title: "Verify a file",
    description: COPY.verify.body,
  },
  "/library": {
    title: "Your records",
    description: "Look up ForeverFile records published with a key in this browser.",
  },
};

export function normalizePath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return path === "/" ? "/" : path.replace(/\/+$/, "") || "/";
}

export function metadataForPath(pathname: string): PageMetadata {
  const path = normalizePath(pathname);

  if (/^\/f\/[a-zA-Z0-9_-]{43}$/.test(path)) {
    return {
      path,
      omitCanonical: path === `/f/${RECORD_SHELL_ID}`,
      title: `Record · ${SITE_NAME}`,
      description: `ForeverFile record. A public, unchangeable published file.`,
    };
  }

  const known = pageMetadata[path];
  if (known) {
    return { path, ...known };
  }

  return {
    path,
    title: "Page not found",
    description: "Check the address, or go back home.",
    noIndex: true,
  };
}

export function canonicalUrl(metadata: PageMetadata) {
  const path = normalizePath(metadata.canonicalPath ?? metadata.path);
  return new URL(path === "/" ? "/" : path, SITE_ORIGIN).href;
}

export function titleForDocument(metadata: PageMetadata) {
  if (metadata.path === "/" || metadata.title.includes(SITE_NAME)) {
    return metadata.title;
  }
  return `${metadata.title} · ${SITE_NAME}`;
}

function setMeta(selector: string, attribute: string, value: string) {
  let element = document.head.querySelector(selector);
  if (!element) {
    const match = selector.match(/^(meta|link)\[(name|property|rel)="([^"]+)"\]$/)!;
    element = document.createElement(match[1]);
    element.setAttribute(match[2], match[3]);
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}

export function syncDocumentMetadata(pathname: string) {
  if (typeof document === "undefined") return;
  const metadata = metadataForPath(pathname);
  const title = titleForDocument(metadata);
  const socialImage = metadata.socialImage ?? SOCIAL_IMAGE;
  const socialImageAlt = metadata.socialImageAlt ?? SOCIAL_IMAGE_ALT;

  document.title = title;
  setMeta('meta[name="description"]', "content", metadata.description);
  setMeta(
    'meta[name="robots"]',
    "content",
    metadata.noIndex ? "noindex, nofollow" : "index, follow",
  );
  if (metadata.noIndex || metadata.omitCanonical) {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
  } else {
    const canonical = canonicalUrl(metadata);
    setMeta('link[rel="canonical"]', "href", canonical);
    setMeta('meta[property="og:url"]', "content", canonical);
  }
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", metadata.description);
  setMeta('meta[property="og:image"]', "content", socialImage);
  setMeta('meta[property="og:image:alt"]', "content", socialImageAlt);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", metadata.description);
  setMeta('meta[name="twitter:image"]', "content", socialImage);
  setMeta('meta[name="twitter:image:alt"]', "content", socialImageAlt);
}

export { NotFoundPage };
