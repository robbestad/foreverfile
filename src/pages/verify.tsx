import { PageShell } from "@/components/page-shell";
import { VerifyPanel } from "@/components/verify-panel";
import { COPY } from "@/lib/copy";
import type { PageProps } from "@/types";
import { create } from "svenjs";

function recordFromSearch(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("record") ?? params.get("id") ?? "";
}

export const VerifyPage = create<PageProps>({
  render() {
    return (
      <PageShell>
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
          {COPY.verify.title}
        </h1>
        <p className="mt-3 max-w-xl text-muted">{COPY.verify.body}</p>
        <VerifyPanel initialRecord={recordFromSearch(this.props.search)} />
      </PageShell>
    );
  },
});
