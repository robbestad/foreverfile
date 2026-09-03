import { ButtonLink } from "@/components/button";
import { PageShell } from "@/components/page-shell";
import { COPY } from "@/lib/copy";
import type { PageProps } from "@/types";
import { create } from "svenjs";

export const NotFoundPage = create<PageProps>({
  render() {
    return (
      <PageShell>
        <h1 className="font-display text-4xl text-ink">Page not found.</h1>
        <p className="mt-3 max-w-xl text-muted">
          Check the address, or go back home.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/">Home</ButtonLink>
          <ButtonLink href="/publish" variant="ghost">
            {COPY.hero.primary}
          </ButtonLink>
        </div>
      </PageShell>
    );
  },
});
