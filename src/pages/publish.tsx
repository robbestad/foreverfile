import { PageShell } from "@/components/page-shell";
import { PublishFlow } from "@/components/publish/flow";
import { COPY } from "@/lib/copy";
import type { PageProps } from "@/types";
import { create } from "svenjs";

export const PublishPage = create<PageProps>({
  render() {
    return (
      <PageShell>
        <PublishFlow />
        <p className="mt-12 text-sm text-muted">
          <a
            href="/library"
            className="text-ink underline decoration-rule underline-offset-4"
          >
            Your records
          </a>
          <span className="mx-2 text-rule">·</span>
          {COPY.publicNotice}
        </p>
      </PageShell>
    );
  },
});
