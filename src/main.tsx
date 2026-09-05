import { App } from "@/app";
import { loadRoute } from "@/site";
import "@/styles/app.css";
import { hydrate, render } from "svenjs";

function hasPrerenderedMarkup(root: Element) {
  for (const node of root.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) continue;
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;
    return true;
  }
  return false;
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app root.");
}

const url = location.pathname + location.search;
void loadRoute(location.pathname).then(() => {
  const tree = <App initialUrl={url} />;
  if (hasPrerenderedMarkup(root)) {
    hydrate(tree, root);
  } else {
    render(tree, root);
  }
}).catch(() => {
  root.replaceChildren();
  const message = document.createElement("p");
  message.textContent = "Could not load this page.";
  const retry = document.createElement("button");
  retry.textContent = "Reload page";
  retry.onclick = () => location.reload();
  root.append(message, retry);
});
