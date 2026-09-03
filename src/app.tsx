import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isInternalLink, matchRoute, navigate } from "@/router";
import { loadRoute, NotFoundPage, routes, syncDocumentMetadata } from "@/site";
import { create, flushSync } from "svenjs";

const EMPTY_PARAMS: Record<string, string> = {};

type ShellProps = {
  initialUrl?: string;
};

type ShellState = {
  path: string;
  search: string;
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
    syncDocumentMetadata(location.pathname);
    if (location.search !== this.state.search) {
      this.setState({ ...this.state, search: location.search });
    }
    this._applyLocation = () => {
      flushSync(() => {
        this.setState({
          path: location.pathname,
          search: location.search,
        });
      });
      syncDocumentMetadata(location.pathname);
      const main = document.getElementById("main");
      const heading = main?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    };
    this._onPop = () => {
      void loadRoute(location.pathname).then(() => this._applyLocation());
    };
    this._onClick = (event: MouseEvent) => {
      const a = (event.target as Element | null)?.closest?.(
        "a",
      ) as HTMLAnchorElement | null;
      if (!a || !isInternalLink(a, event) || !matchRoute(a.pathname, routes)) {
        return;
      }
      event.preventDefault();
      const to = a.pathname + a.search + a.hash;
      void loadRoute(a.pathname).then(() => navigate(to));
    };
    window.addEventListener("popstate", this._onPop);
    this._root?.addEventListener("click", this._onClick);
  },
  onDestroy() {
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
        <main className="flex-1" id="main">
          <Page params={params} search={this.state.search} />
        </main>
        <SiteFooter />
      </div>
    );
  },
});
