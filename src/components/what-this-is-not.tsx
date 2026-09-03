import { COPY } from "@/lib/copy";
import { create } from "svenjs";

export const WhatThisIsNot = create({
  render() {
    return (
      <section className="mt-16 sm:mt-20">
        <ul className="flex flex-wrap gap-2">
          {COPY.notThis.items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-rule/80 bg-panel/40 px-3.5 py-1.5 text-sm text-muted"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    );
  },
});
