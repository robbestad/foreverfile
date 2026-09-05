import { ButtonLink } from "@/components/button";
import { PageShell } from "@/components/page-shell";
import { PropertyList } from "@/components/property-list";
import { RecentRecords } from "@/components/recent-records";
import { VerifyPanel } from "@/components/verify-panel";
import { WhatThisIsNot } from "@/components/what-this-is-not";
import { COPY } from "@/lib/copy";
import type { PageProps } from "@/types";
import { create } from "svenjs";

export const HomePage = create<PageProps>({
  render() {
    return (
      <PageShell wide>
        <h1 className="font-display text-4xl leading-[1.12] text-ink sm:text-[3.25rem]">
          {COPY.hero.title}
        </h1>
        <p className="mt-5 max-w-lg text-lg text-muted">{COPY.hero.lead}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/publish">{COPY.hero.primary}</ButtonLink>
          <ButtonLink href="/how" variant="ghost">
            {COPY.hero.secondary}
          </ButtonLink>
        </div>

        <PropertyList />
        <RecentRecords />

        <section className="mt-16 sm:mt-20">
          <VerifyPanel home />
        </section>

        <WhatThisIsNot />
      </PageShell>
    );
  },
});
