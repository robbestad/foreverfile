import { DEMO_RECORD } from "@/lib/examples";
import { formatPublishedDate } from "@/lib/format";
import { foreverFileDisplayUrl } from "@/lib/record";
import { create } from "svenjs";

const STEPS = [
  { label: "On this device", value: DEMO_RECORD.name },
  { label: "Published", value: formatPublishedDate(DEMO_RECORD.timestamp) },
  { label: "Public record", value: foreverFileDisplayUrl(DEMO_RECORD.id, true) },
  { label: "Checked", value: "Unchanged since publication" },
] as const;

export const ProductDemo = create({
  render() {
    return (
      <section className="mt-16 sm:mt-20">
        <div className="rounded-2xl border border-rule/80 bg-panel/40 px-5 py-6 sm:px-7 sm:py-8">
          <ol className="flex flex-col">
            {STEPS.map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <div className="flex w-2.5 shrink-0 flex-col items-center">
                  <span
                    aria-hidden
                    className="mt-1.5 size-2.5 rounded-full bg-ink"
                  />
                  {index < STEPS.length - 1 ? (
                    <span aria-hidden className="w-px flex-1 bg-rule" />
                  ) : null}
                </div>
                <div
                  className={
                    index < STEPS.length - 1 ? "min-w-0 pb-5" : "min-w-0"
                  }
                >
                  <p className="text-xs text-muted">{step.label}</p>
                  <p className="truncate font-medium text-ink">{step.value}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  },
});
