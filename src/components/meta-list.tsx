import { cn } from "@/lib/cn";
import { create } from "svenjs";

type MetaListProps = {
  items: { label: string; value: unknown; mono?: boolean }[];
  className?: string;
};

export const MetaList = create<MetaListProps>({
  render() {
    const { items, className } = this.props;
    return (
      <dl className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd
              className={cn(
                "mt-0.5 break-words text-ink",
                item.mono && "font-mono text-sm",
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  },
});
