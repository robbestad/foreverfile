import { ButtonLink } from "@/components/button";
import { PageShell } from "@/components/page-shell";
import { COPY } from "@/lib/copy";
import type { PageProps } from "@/types";
import { create } from "svenjs";

const STEPS = [
  {
    title: "You publish a version",
    body: "Later edits on your computer don't change it. A new file is a new record.",
  },
  {
    title: "It's public on purpose",
    body: "If it should stay private, don't publish it.",
  },
  {
    title: "The identity is the file",
    body: "Change one byte, and the fingerprint changes.",
  },
  {
    title: "Built to outlast this site",
    body: "The bytes live on the network. Removing a bookmark does not unpublish them.",
  },
  {
    title: "What we don't claim",
    body: COPY.persistence,
  },
] as const;

export const HowPage = create<PageProps>({
  render() {
    return (
      <PageShell>
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
          {COPY.how.title}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{COPY.how.lead}</p>

        <ol className="mt-12 flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-rule/80 bg-panel/40 px-5 py-5"
            >
              <h2 className="font-medium text-ink">
                <span className="mr-2 text-muted">{index + 1}.</span>
                {step.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm text-muted">{COPY.how.arweave}</p>

        <div className="mt-10">
          <ButtonLink href="/publish">{COPY.hero.primary}</ButtonLink>
        </div>
      </PageShell>
    );
  },
});
