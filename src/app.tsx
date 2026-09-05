import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isInternalLink, matchRoute, navigate } from "@/router";
import { loadRoute, NotFoundPage, routes, syncDocumentMetadata } from "@/site";
import { registration, syncRegistrations } from "@/stores/registration";
import { upload } from "@/stores/upload";
import { create, flushSync } from "svenjs";

const EMPTY_PARAMS: Record<string, string> = {};

type ShellProps = {
  initialUrl?: string;
};

type ShellState = {
  path: string;
  search: string;
  routeError?: boolean;
};

export const App = create<ShellProps, ShellState>({
  initialState(props) {
    const initialUrl =
      props.initialUrl ??
      (typeof location === "undefined" ? "/" : location.href);
    const url = new URL(initialUrl, "https://foreverfile.local");
    return {
      path: url.pathname,
      search: url.search,
    };
  },
  onMount() {
    this.observe(upload);
    this.observe(registration);
    this._onOnline = () => { void syncRegistrations(); };
    window.addEventListener("online", this._onOnline);
    void syncRegistrations();
    this._navigation = 0;
    syncDocumentMetadata(location.pathname);
    if (location.search !== this.state.search) {
      this.setState({ ...this.state, search: location.search });
    }
    this._onPop = async () => {
      const generation = ++this._navigation;
      const { pathname: path, search } = location;
      try {
        await loadRoute(path);
        if (generation !== this._navigation) return;
        syncDocumentMetadata(path);
        flushSync(() => this.setState({ path, search, routeError: false }));
        const heading = document.getElementById("main")?.querySelector("h1");
        heading?.setAttribute("tabindex", "-1");
        heading?.focus();
      } catch {
        if (generation !== this._navigation) return;
        this.setState({ path, search, routeError: true });
      }
    };
    this._onClick = (event: MouseEvent) => {
      const a = (event.target as Element | null)?.closest?.(
        "a",
      ) as HTMLAnchorElement | null;
      if (!a || !isInternalLink(a, event)) {
        return;
      }
      event.preventDefault();
      const to = a.pathname + a.search + a.hash;
      navigate(to);
    };
    window.addEventListener("popstate", this._onPop);
    this._root?.addEventListener("click", this._onClick);
  },
  onDestroy() {
    this._navigation++;
    window.removeEventListener("online", this._onOnline);
    window.removeEventListener("popstate", this._onPop);
    this._root?.removeEventListener("click", this._onClick);
  },
  render() {
    const matched = matchRoute(this.state.path, routes);
    const Page = matched?.route.component ?? NotFoundPage;
    if (this._matchPath !== this.state.path) {
      this._matchPath = this.state.path;
      this._params = matched?.params ?? EMPTY_PARAMS;
    }
    const params = this._params ?? EMPTY_PARAMS;

    return (
      <div
        className="flex min-h-dvh flex-col"
        ref={(el: HTMLElement | null) => (this._root = el)}
      >
        <SiteHeader />
        {upload.get().status !== "idle" ? <aside className="border-b border-rule px-6 py-3" aria-live="polite"><a href="/publish">Publication: {upload.get().status} · {Math.round(upload.get().progress)}% — open upload session</a></aside> : null}
        {registration.get().pending > 0 ? <aside className="border-b border-rule px-6 py-3" aria-live="polite">
          <p>{registration.get().error ?? "Saving public listing…"}</p>
          {!registration.get().working ? <button className="underline" onClick={() => void syncRegistrations()}>Retry registration</button> : null}
        </aside> : null}
        <main className="flex-1" id="main">
          {this.state.routeError ? <div role="alert" className="p-8"><h1>Could not load this page</h1><button onClick={() => location.reload()}>Reload page</button></div> : <Page params={params} search={this.state.search} />}
        </main>
        <SiteFooter />
      </div>
    );
  },
});
