/** Development-only manual smoke harness; never imported by the application/build.
 * All Arweave traffic is simulated. The generated test key lives only in memory.
 */
import { render, h } from "svenjs";
import { App } from "../src/app";
import { loadRoute } from "../src/site";
import { getArweave } from "../src/lib/arweave";
import { lockWallet, wallet } from "../src/stores/wallet";
import "../src/styles/app.css";
const nativeFetch = window.fetch.bind(window);
let release: (() => void) | undefined;
let failChunk = true;
window.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  if (url.origin === location.origin && url.pathname === "/api/records") {
    return init?.method === "POST" ? Response.json({ kind: "pending" }, { status: 202 }) : Response.json({ records: [] });
  }
  if (url.origin === location.origin) return nativeFetch(input, init);
  if (url.hostname !== "arweave.net") throw new Error("Smoke test blocks external traffic.");
  if (url.pathname.includes("/balance")) return new Response("9999999999999999");
  if (url.pathname.startsWith("/price/")) return new Response("100");
  if (url.pathname === "/tx_anchor") return new Response("a".repeat(43));
  if (url.pathname === "/graphql") return Response.json({ data: { transaction: null } });
  if (url.pathname.startsWith("/tx/")) return new Response("Pending", { status: 202 });
  if (url.pathname === "/tx") return new Response("OK");
  if (url.pathname === "/chunk") {
    await new Promise<void>((resolve, reject) => {
      release = resolve;
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
    release = undefined;
    if (failChunk) { failChunk = false; return Response.json({ error: "simulated chunk failure" }, { status: 503 }); }
    return new Response("OK");
  }
  throw new Error(`Unexpected smoke request: ${url.pathname}`);
};
const controls = document.getElementById("test-controls")!;
controls.className = "border-b p-4";
function button(label: string, action: () => void | Promise<void>) {
  const el = document.createElement("button"); el.textContent = label; el.className = "border px-4 py-2 mr-2";
  el.onclick = () => { void action(); }; controls.append(el); return el;
}
const setup = button("Generate temporary test wallet", async () => {
  setup.disabled = true;
  const jwk = await getArweave().wallets.generate();
  const address = await getArweave().wallets.jwkToAddress(jwk);
  wallet.set({ status: "unlocked", jwk, address }); setup.textContent = "Temporary test wallet ready";
});
button("Select synthetic 1 MB file", () => {
  const input = document.querySelector<HTMLInputElement>('#app input[type="file"]')!;
  const files = new DataTransfer(); files.items.add(new File([new Uint8Array(1_000_000)], "synthetic-smoke.bin"));
  input.files = files.files; input.dispatchEvent(new Event("change", { bubbles: true }));
});
button("Release next simulated chunk", () => release?.());
button("Lock test wallet", lockWallet);
history.replaceState({}, "", "/publish");
await loadRoute("/publish");
render(h(App, { initialUrl: "/publish" }), document.getElementById("app"));
