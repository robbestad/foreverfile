import { MetaList } from "@/components/meta-list";
import { Stamp } from "@/components/stamp";
import { cn } from "@/lib/cn";
import { formatBytes, formatPublishedDate, shortId } from "@/lib/format";
import { formatFileIdentity } from "@/lib/hash";
import {
  foreverFileDisplayUrl,
  type ForeverFileRecord,
  type StampKind,
} from "@/lib/record";
import { create } from "svenjs";

type RecordSheetProps = {
  record: ForeverFileRecord;
  stamp: StampKind;
  status?: string;
  example?: boolean;
  newlyPublished?: boolean;
  compact?: boolean;
  children?: unknown;
};

export const RecordSheet = create<RecordSheetProps>({
  render() {
    const {
      record,
      stamp,
      status,
      example = false,
      newlyPublished = false,
      compact = false,
      children,
    } = this.props;

    const identity = record.sha256
      ? formatFileIdentity(record.sha256, true)
      : "Available after download";

    const items = compact
      ? [
          {
            label: "Published",
            value: formatPublishedDate(record.timestamp),
          },
          {
            label: "Size",
            value: formatBytes(record.size),
          },
          {
            label: "Public URL",
            value: foreverFileDisplayUrl(record.id, true),
            mono: true,
          },
        ]
      : [
          {
            label: "Published",
            value: formatPublishedDate(record.timestamp),
          },
          {
            label: "Size",
            value: formatBytes(record.size),
          },
          {
            label: "File identity",
            value: (
              <span
                title={
                  record.sha256 ? formatFileIdentity(record.sha256) : undefined
                }
              >
                {identity}
              </span>
            ),
            mono: true,
          },
          {
            label: "Record ID",
            value: <span title={record.id}>{shortId(record.id)}</span>,
            mono: true,
          },
          {
            label: "Public URL",
            value: foreverFileDisplayUrl(record.id, true),
            mono: true,
          },
        ];

    return (
      <article
        className={cn(
          "rounded-2xl border border-rule/80 bg-panel/40",
          compact ? "px-5 py-5" : "px-5 py-6 sm:px-7 sm:py-7",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            className={cn(
              "min-w-0 font-display text-ink",
              compact
                ? "text-xl"
                : "text-[1.65rem] leading-tight sm:text-[1.85rem]",
            )}
          >
            {record.name}
          </h2>
          <Stamp kind={stamp} animate={newlyPublished} />
        </div>

        {status ? <p className="mt-2 text-sm text-muted">{status}</p> : null}

        <MetaList className="mt-6" items={items} />

        {children ? <div className="mt-6">{children}</div> : null}

        {example ? <p className="mt-5 text-xs text-muted">Example</p> : null}
      </article>
    );
  },
});
