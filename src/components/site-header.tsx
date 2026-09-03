import { ButtonLink } from "@/components/button";
import { ForeverFileMark } from "@/components/foreverfile-mark";
import { COPY } from "@/lib/copy";
import { create } from "svenjs";

const NavLinks = create({
  render() {
    return (
      <>
        <a href="/how" className="transition-colors hover:text-ink">
          How it works
        </a>
        <a href="/verify" className="transition-colors hover:text-ink">
          Verify
        </a>
      </>
    );
  },
});

export const SiteHeader = create({
  render() {
    return (
      <header className="sticky top-0 z-20 border-b border-rule/80 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[880px] px-5 py-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <a
              href="/"
              className="inline-flex items-center gap-2.5 font-display text-xl leading-none text-ink"
            >
              <ForeverFileMark size={32} />
              {COPY.name}
            </a>
            <div className="flex items-center gap-5">
              <nav
                aria-label="Primary"
                className="hidden text-sm text-muted sm:flex sm:gap-5"
              >
                <NavLinks />
              </nav>
              <ButtonLink href="/publish" className="px-4 py-2">
                {COPY.hero.primary}
              </ButtonLink>
            </div>
          </div>
          <nav
            aria-label="Primary"
            className="mt-3 flex gap-5 text-sm text-muted sm:hidden"
          >
            <NavLinks />
          </nav>
        </div>
      </header>
    );
  },
});
