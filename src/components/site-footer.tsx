import { SvenjsStamp } from "@/components/svenjs-stamp";
import { COPY } from "@/lib/copy";
import { create } from "svenjs";

export const SiteFooter = create({
  render() {
    return (
      <footer className="border-t border-rule/80">
        <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{COPY.footer}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <nav
              aria-label="Footer"
              className="flex flex-wrap gap-x-5 gap-y-2 text-ink"
            >
              <a href="/how" className="hover:underline">
                How it works
              </a>
              <a href="/verify" className="hover:underline">
                Verify
              </a>
              <a href="/library" className="hover:underline">
                Your records
              </a>
            </nav>
            <SvenjsStamp />
          </div>
        </div>
      </footer>
    );
  },
});
