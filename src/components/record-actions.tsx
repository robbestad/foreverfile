import { ButtonLink } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import { COPY } from "@/lib/copy";
import { arweaveUrl } from "@/lib/format";
import { foreverFileUrl, recordPath } from "@/lib/record";
import { create } from "svenjs";

type RecordActionsProps = {
  id: string;
};

export const RecordActions = create<RecordActionsProps>({
  render() {
    const { id } = this.props;
    const copyValue =
      typeof window === "undefined"
        ? foreverFileUrl(id)
        : `${window.location.origin}${recordPath(id)}`;

    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={arweaveUrl(id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors duration-200 hover:bg-ink/90"
        >
          {COPY.record.download}
        </a>
        <CopyButton value={copyValue} label={COPY.record.copyLink} />
        <ButtonLink href={`/verify?record=${id}`} variant="ghost">
          {COPY.record.verify}
        </ButtonLink>
      </div>
    );
  },
});

type NetworkLocationProps = {
  id: string;
};

export const NetworkLocation = create<NetworkLocationProps>({
  render() {
    const { id } = this.props;
    return (
      <div className="mt-8 text-sm text-muted">
        <p>{COPY.record.unchangedExplainer}</p>
        <p className="mt-3">
          {COPY.record.networkBody}{" "}
          <a
            href={arweaveUrl(id)}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-ink hover:underline"
          >
            {arweaveUrl(id).replace(/^https:\/\//, "")}
          </a>
        </p>
      </div>
    );
  },
});
