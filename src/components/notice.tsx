import { cn } from "@/lib/cn";
import { create } from "svenjs";

type NoticeProps = {
  children?: unknown;
  className?: string;
};

export const Notice = create<NoticeProps>({
  render() {
    const { children, className } = this.props;
    return (
      <div
        className={cn(
          "rounded-2xl border border-stamp/20 bg-stamp/[0.06] px-5 py-5 sm:px-6 sm:py-6",
          className,
        )}
      >
        {children}
      </div>
    );
  },
});
