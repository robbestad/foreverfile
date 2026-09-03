import { COPY } from "@/lib/copy";
import { create } from "svenjs";

const ITEMS = [
  COPY.properties.public,
  COPY.properties.unchanged,
  COPY.properties.persistent,
] as const;

export const PropertyList = create({
  render() {
    return (
      <section className="mt-16 sm:mt-20">
        <h2 className="text-sm font-medium text-muted">{COPY.properties.intro}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-rule/80 bg-panel/40 px-5 py-5"
            >
              <h3 className="font-medium text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    );
  },
});
