import { SvenjsStamp } from "@/components/svenjs-stamp";
import { COPY } from "@/lib/copy";
import { create } from "svenjs";

const SOURCE_HREF = "https://github.com/robbestad/foreverfile";

export const SiteFooter = create({
  render() {
    return (
      <footer className="border-t border-rule/80">
        <div className="mx-auto w-full max-w-[880px] px-5 py-8 text-sm text-muted sm:px-6">
          <p>{COPY.footer}</p>
          <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3">
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
              <a
                href={SOURCE_HREF}
                className="hover:underline"
                rel="noopener noreferrer"
              >
                Source
              </a>
            </nav>
            <SvenjsStamp />
          </div>
        </div>
      </footer>
    );
  },
});
