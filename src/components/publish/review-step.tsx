import { Button } from "@/components/button";
import { Notice } from "@/components/notice";
import type { Amount } from "@/lib/arweave";
import { COPY } from "@/lib/copy";
import { formatAr, formatBytes } from "@/lib/format";
import { formatFileIdentity } from "@/lib/hash";
import { create } from "svenjs";

type Acks = {
  isPublic: boolean;
  irreversible: boolean;
  notPrivate: boolean;
};

type ReviewStepProps = {
  file: File;
  sha256: string;
  fee: Amount | undefined;
  feeLoading: boolean;
  feeError: boolean;
  balance: Amount | undefined;
  authorized: boolean;
  acks: Acks;
  onAck: (key: keyof Acks, value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  error: string | null;
};

type AckProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
};

const Ack = create<AckProps>({
  render() {
    const { checked, onChange, label } = this.props;
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-rule/80 bg-panel/30 px-4 py-3 text-sm text-ink has-[:checked]:border-ink/20 has-[:checked]:bg-panel">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event: Event) =>
            onChange((event.target as HTMLInputElement).checked)
          }
          className="mt-0.5 size-4 rounded border-rule accent-ink"
        />
        <span>{label}</span>
      </label>
    );
  },
});

export const ReviewStep = create<ReviewStepProps>({
  render() {
    const {
      file,
      sha256,
      fee,
      feeLoading,
      feeError,
      balance,
      authorized,
      acks,
      onAck,
      onBack,
      onContinue,
      error,
    } = this.props;
    const insufficient =
      fee && balance && BigInt(balance.winston) < BigInt(fee.winston);
    const allAcked = acks.isPublic && acks.irreversible && acks.notPrivate;
    const canContinue = allAcked && !insufficient && !feeLoading && Boolean(fee);

    return (
      <div>
        <h1 className="font-display mt-6 text-4xl leading-tight text-ink sm:text-5xl">
          {COPY.publish.reviewTitle}
        </h1>
        <p className="mt-3 truncate font-mono text-sm text-muted">
          {file.name} · {formatBytes(file.size)} ·{" "}
          {formatFileIdentity(sha256, true)}
        </p>

        <Notice className="mt-8">
          <ul className="flex flex-col gap-5">
            <li>
              <p className="font-medium text-stamp">{COPY.publish.publicTitle}</p>
              <p className="mt-1 text-sm text-ink">
                {COPY.publish.publicBody(file.name)}
              </p>
            </li>
            <li>
              <p className="font-medium text-stamp">
                {COPY.publish.unchangedTitle}
              </p>
              <p className="mt-1 text-sm text-ink">{COPY.publish.unchangedBody}</p>
            </li>
            <li>
              <p className="font-medium text-stamp">{COPY.publish.privateTitle}</p>
              <p className="mt-1 text-sm text-ink">{COPY.publish.privateBody}</p>
            </li>
          </ul>
        </Notice>

        <div className="mt-8 rounded-2xl border border-rule/80 bg-panel/40 px-5 py-5">
          <p className="text-xs text-muted">{COPY.publish.feeLabel}</p>
          <p className="mt-1 font-mono text-lg text-ink">
            {feeLoading
              ? "Estimating…"
              : fee
                ? `${formatAr(fee.ar)} AR`
                : feeError
                  ? "Could not estimate"
                  : "—"}
          </p>
          <p className="mt-1 text-sm text-muted">{COPY.publish.feeBody}</p>
          {!authorized ? (
            <p className="mt-3 text-sm text-ink">{COPY.publish.authorizeHint}</p>
          ) : null}
          {insufficient ? (
            <p className="mt-3 text-sm text-stamp">
              Not enough AR to cover the fee.
            </p>
          ) : null}
        </div>

        <fieldset className="mt-8 flex flex-col gap-3">
          <legend className="sr-only">Confirm before publishing</legend>
          <Ack
            checked={acks.isPublic}
            onChange={(value) => onAck("isPublic", value)}
            label={COPY.publish.ackPublic}
          />
          <Ack
            checked={acks.irreversible}
            onChange={(value) => onAck("irreversible", value)}
            label={COPY.publish.ackIrreversible}
          />
          <Ack
            checked={acks.notPrivate}
            onChange={(value) => onAck("notPrivate", value)}
            label={COPY.publish.ackPrivate}
          />
        </fieldset>

        {error ? (
          <p role="alert" className="mt-6 text-sm text-stamp">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 mt-8 flex flex-col gap-3 bg-paper/95 py-4 sm:static sm:flex-row sm:bg-transparent sm:py-0">
          <Button type="button" disabled={!canContinue} onClick={onContinue}>
            {COPY.publish.publishCta}
          </Button>
          <Button type="button" variant="ghost" onClick={onBack}>
            {COPY.publish.differentFile}
          </Button>
        </div>
      </div>
    );
  },
});
