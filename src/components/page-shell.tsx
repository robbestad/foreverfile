import { cn } from "@/lib/cn";
import { create } from "svenjs";

type PageShellProps = {
  children?: unknown;
  wide?: boolean;
  className?: string;
};

export const PageShell = create<PageShellProps>({
  render() {
    const { children, wide = false, className } = this.props;
    return (
      <div
        className={cn(
          "mx-auto w-full px-5 py-12 sm:px-6 sm:py-16",
          wide ? "max-w-[880px]" : "max-w-[720px]",
          className,
        )}
      >
        {children}
      </div>
    );
  },
});
