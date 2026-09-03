import { cn } from "@/lib/cn";
import type { StampKind } from "@/lib/record";
import { create } from "svenjs";

const LABELS: Record<StampKind, string> = {
  verified: "Verified",
  public: "Public",
  unchanged: "Unchanged",
  persistent: "Persistent",
  pending: "Pending",
  published: "Published",
};

const TONES: Record<StampKind, string> = {
  verified: "bg-verified/10 text-verified",
  public: "bg-stamp/10 text-stamp",
  unchanged: "bg-ink/5 text-ink",
  persistent: "bg-ink/5 text-ink",
  pending: "bg-pending/15 text-pending",
  published: "bg-verified/10 text-verified",
};

type StampProps = {
  kind: StampKind;
  animate?: boolean;
  className?: string;
};

export const Stamp = create<StampProps>({
  render() {
    const { kind, animate = false, className } = this.props;
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
          TONES[kind],
          animate && "stamp-animate",
          className,
        )}
      >
        {LABELS[kind]}
      </span>
    );
  },
});
