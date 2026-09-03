import { Stamp } from "@/components/stamp";
import { fileKind, formatBytes, formatPublishedDate } from "@/lib/format";
import type { ForeverFileRecord, StampKind } from "@/lib/record";
import { create } from "svenjs";

type RecordRowProps = {
  record: ForeverFileRecord;
  stamp: StampKind;
  detail?: string;
};

export const RecordRow = create<RecordRowProps>({
  render() {
    const { record, stamp, detail } = this.props;
    return (
      <article className="flex items-center gap-4 rounded-2xl border border-rule/80 bg-panel/40 px-4 py-3.5">
        <div
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-paper font-mono text-[10px] tracking-wide text-muted"
        >
          {fileKind(record.contentType)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{record.name}</p>
          <p className="truncate text-sm text-muted">
            {detail ??
              `${formatPublishedDate(record.timestamp)} · ${formatBytes(record.size)}`}
          </p>
        </div>
        <Stamp kind={stamp} />
      </article>
    );
  },
});
