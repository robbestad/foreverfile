// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { create, render, unmountRoot, flushSync } from "svenjs";
import { matchRoute, navigate } from "./router";
import { App } from "./app";
import { routes, metadataForPath, RECORD_SHELL_ID, syncDocumentMetadata } from "./site";
import { deferred } from "./test/helpers";
vi.mock("./lib/registry", () => ({ registeredRecords: vi.fn().mockResolvedValue([]) }));
const root = document.createElement("div");
document.body.append(root);
const originalRoutes = [...routes];
afterEach(() => { unmountRoot(root); routes.splice(0, routes.length, ...originalRoutes); vi.restoreAllMocks(); });
const settle = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); flushSync(); } };
it("treats invalid URL encoding as a missing route", () => { expect(matchRoute("/f/%", routes)).toBeNull(); });
it("only the last click or popstate navigation can finish", async () => {
  const slow = deferred<any>();
  const First = create({ render() { return <h1>First</h1>; } });
  const Last = create({ render() { return <h1>Last</h1>; } });
  routes.splice(0, routes.length, { path: "/", component: create({ render() { return <><a href="/slow">Slow</a><a href="/last">Last</a></>; } }) }, { path: "/slow", load: () => slow.promise }, { path: "/last", component: Last });
  history.replaceState({}, "", "/"); render(<App initialUrl="/" />, root);
  root.querySelector<HTMLAnchorElement>('a[href="/slow"]')!.click();
  navigate("/last"); await settle(); slow.resolve(First); await settle();
  expect(location.pathname).toBe("/last"); expect(root.querySelector("h1")?.textContent).toBe("Last");
  history.replaceState({}, "", "/slow"); window.dispatchEvent(new PopStateEvent("popstate")); await settle(); expect(root.querySelector("h1")?.textContent).toBe("First");
});
it("renders a reload option when route import fails", async () => {
  routes.push({ path: "/broken", load: () => Promise.reject(new Error("chunk failed")) });
  history.replaceState({}, "", "/"); render(<App initialUrl="/" />, root); navigate("/broken"); await settle();
  expect(root.textContent).toContain("Could not load this page"); expect(root.textContent).toContain("Reload page");
});
it("recreates canonical and social tags after a 404 and omits the artificial shell ID", () => {
  document.head.innerHTML = ""; syncDocumentMetadata("/missing"); expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  syncDocumentMetadata("/verify"); expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/verify"); expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toContain("Verify");
  expect(metadataForPath(`/f/${RECORD_SHELL_ID}`).omitCanonical).toBe(true);
  syncDocumentMetadata(`/f/${RECORD_SHELL_ID}`); expect(document.querySelector('link[rel="canonical"]')).toBeNull();
});
it("marks malformed document paths as non-indexable missing pages", () => {
  expect(metadataForPath("/f/%").noIndex).toBe(true);
  expect(metadataForPath("/f/not-an-id").title).toBe("Page not found");
});
