import { cn } from "@/lib/cn";
import { create } from "svenjs";

const STEPS = ["Choose", "Review", "Publish", "Verify"] as const;

type StepRailProps = {
  current: 0 | 1 | 2 | 3;
};

export const StepRail = create<StepRailProps>({
  render() {
    const { current } = this.props;
    return (
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              index === current
                ? "bg-ink text-paper"
                : index < current
                  ? "bg-panel text-ink"
                  : "text-muted",
            )}
          >
            {label}
          </li>
        ))}
      </ol>
    );
  },
});
