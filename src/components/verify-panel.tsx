import { Button } from "@/components/button";
import { RecordSheet } from "@/components/record-sheet";
import { Stamp } from "@/components/stamp";
import { fetchPublishedBytes, getRecord } from "@/lib/arweave";
import { COPY } from "@/lib/copy";
import { formatBytes, formatPublishedDate } from "@/lib/format";
import { identitiesMatch, sha256Blob, sha256Hex } from "@/lib/hash";
import { parseRecordId, type ForeverFileRecord } from "@/lib/record";
import { FILE_SIZE_WARN_BYTES } from "@/lib/tags";
import { create } from "svenjs";

type Outcome =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "invalid" }
  | { kind: "not-found" }
  | { kind: "file-missing" }
  | { kind: "too-large"; record?: ForeverFileRecord }
  | { kind: "found"; record: ForeverFileRecord }
  | { kind: "pending"; record: ForeverFileRecord }
  | { kind: "verified"; record: ForeverFileRecord }
  | { kind: "verified-pending"; record: ForeverFileRecord }
  | { kind: "mismatch"; record: ForeverFileRecord }
  | { kind: "integrity"; record: ForeverFileRecord }
  | { kind: "error"; message: string };

type VerifyPanelProps = {
  initialRecord?: string;
  home?: boolean;
};

type VerifyPanelState = {
  link: string;
  file: File | null;
  outcome: Outcome;
};

type OutcomeProps = { outcome: Outcome };

const VerifyOutcome = create<OutcomeProps>({
  render() {
    const { outcome } = this.props;
    if (outcome.kind === "idle" || outcome.kind === "verifying") return null;

    if (outcome.kind === "invalid") {
      return <p className="text-stamp">{COPY.verify.invalid}</p>;
    }
    if (outcome.kind === "not-found") {
      return <p className="text-stamp">{COPY.verify.notFound}</p>;
    }
    if (outcome.kind === "file-missing") {
      return <p className="text-stamp">{COPY.verify.fileMissing}</p>;
    }
    if (outcome.kind === "error") {
      return <p className="text-stamp">{outcome.message}</p>;
    }
    if (outcome.kind === "too-large") {
      return (
        <div className="flex flex-col gap-4">
          <p className="text-stamp">{COPY.verify.tooLarge}</p>
          {outcome.record ? (
            <RecordSheet record={outcome.record} stamp="unchanged" compact />
          ) : null}
        </div>
      );
    }

    const record = outcome.record;
    const date = formatPublishedDate(record.timestamp);

    if (outcome.kind === "verified") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Stamp kind="verified" />
            <p className="text-ink">{COPY.verify.verified(date)}</p>
          </div>
          <RecordSheet record={record} stamp="verified" compact />
        </div>
      );
    }

    if (outcome.kind === "verified-pending") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Stamp kind="verified" />
            <p className="text-ink">
              Exact match. Publication time is still landing.
            </p>
          </div>
          <RecordSheet record={record} stamp="pending" compact />
        </div>
      );
    }

    if (outcome.kind === "mismatch") {
      return (
        <div className="flex flex-col gap-4">
          <p className="text-stamp">{COPY.verify.mismatch}</p>
          <RecordSheet record={record} stamp="unchanged" compact />
        </div>
      );
    }

    if (outcome.kind === "integrity") {
      return (
        <div className="flex flex-col gap-4">
          <p className="text-stamp">{COPY.verify.integrity}</p>
          <RecordSheet record={record} stamp="unchanged" compact />
        </div>
      );
    }

    if (outcome.kind === "pending") {
      return (
        <div className="flex flex-col gap-4">
          <p className="text-pending">{COPY.verify.pending}</p>
          <RecordSheet
            record={record}
            stamp="pending"
            status={COPY.verify.found}
            compact
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <p className="text-ink">{COPY.verify.found}</p>
        <RecordSheet record={record} stamp="public" compact />
      </div>
    );
  },
});

export const VerifyPanel = create<VerifyPanelProps, VerifyPanelState>({
  initialState(props) {
    return {
      link: props.initialRecord ?? "",
      file: null,
      outcome: { kind: "idle" },
    };
  },
  onUpdate() {
    const next = this.props.initialRecord ?? "";
    if (this._seeded !== next) {
      this._seeded = next;
      if (next && next !== this.state.link) {
        this.setState({ ...this.state, link: next });
      }
    }
  },
  render() {
    const { home = false } = this.props;
    const { link, file, outcome } = this.state;
    const pending = outcome.kind === "verifying";

    const onSubmit = async (event: Event) => {
      event.preventDefault();
      const id = parseRecordId(this.state.link);
      if (!this.state.link.trim() && !this.state.file) {
        this.setState({ ...this.state, outcome: { kind: "file-missing" } });
        return;
      }
      if (!id) {
        this.setState({ ...this.state, outcome: { kind: "invalid" } });
        return;
      }

      this.setState({ ...this.state, outcome: { kind: "verifying" } });
      try {
        const record = await getRecord(id);
        if (!record) {
          this.setState({ ...this.state, outcome: { kind: "not-found" } });
          return;
        }
        const selected = this.state.file;
        if (!selected) {
          this.setState({
            ...this.state,
            outcome: record.timestamp
              ? { kind: "found", record }
              : { kind: "pending", record },
          });
          return;
        }

        const localHash = await sha256Blob(selected);
        const tooLarge = selected.size > FILE_SIZE_WARN_BYTES;

        if (record.sha256 && identitiesMatch(localHash, record.sha256)) {
          if (tooLarge) {
            this.setState({
              ...this.state,
              outcome: record.timestamp
                ? { kind: "verified", record }
                : { kind: "verified-pending", record },
            });
            return;
          }
          const published = await sha256Hex(await fetchPublishedBytes(record.id));
          if (!identitiesMatch(published, record.sha256)) {
            this.setState({ ...this.state, outcome: { kind: "integrity", record } });
            return;
          }
          if (!identitiesMatch(localHash, published)) {
            this.setState({ ...this.state, outcome: { kind: "mismatch", record } });
            return;
          }
          this.setState({
            ...this.state,
            outcome: record.timestamp
              ? { kind: "verified", record }
              : { kind: "verified-pending", record },
          });
          return;
        }

        if (record.sha256 && !identitiesMatch(localHash, record.sha256)) {
          if (tooLarge) {
            this.setState({ ...this.state, outcome: { kind: "mismatch", record } });
            return;
          }
          const published = await sha256Hex(await fetchPublishedBytes(record.id));
          if (!identitiesMatch(published, record.sha256)) {
            this.setState({ ...this.state, outcome: { kind: "integrity", record } });
            return;
          }
          this.setState({ ...this.state, outcome: { kind: "mismatch", record } });
          return;
        }

        if (tooLarge) {
          this.setState({ ...this.state, outcome: { kind: "too-large", record } });
          return;
        }

        const published = await sha256Hex(await fetchPublishedBytes(record.id));
        if (identitiesMatch(localHash, published)) {
          this.setState({
            ...this.state,
            outcome: record.timestamp
              ? { kind: "verified", record }
              : { kind: "verified-pending", record },
          });
          return;
        }
        this.setState({ ...this.state, outcome: { kind: "mismatch", record } });
      } catch (err) {
        this.setState({
          ...this.state,
          outcome: {
            kind: "error",
            message:
              err instanceof Error
                ? err.message
                : "Could not verify that record.",
          },
        });
      }
    };

    return (
      <div>
        {home ? (
          <>
            <h2 className="font-display text-3xl text-ink">
              {COPY.verify.homeTitle}
            </h2>
            <p className="mt-2 max-w-xl text-muted">{COPY.verify.homeBody}</p>
          </>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="verify-link" className="text-xs text-muted">
              {COPY.verify.pasteLabel}
            </label>
            <input
              id="verify-link"
              value={link}
              onInput={(event: Event) => {
                this.setState({
                  ...this.state,
                  link: (event.target as HTMLInputElement).value,
                });
              }}
              placeholder={COPY.verify.pastePlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 w-full rounded-2xl border border-rule bg-paper px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-muted/60 focus:border-ink"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <input
              ref={(el: HTMLInputElement | null) => (this._fileInput = el)}
              type="file"
              onChange={(event: Event) => {
                const input = event.target as HTMLInputElement;
                this.setState({
                  ...this.state,
                  file: input.files?.[0] ?? null,
                });
                input.value = "";
              }}
              className="hidden"
              tabIndex={-1}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => this._fileInput?.click()}
            >
              {COPY.verify.chooseFile}
            </Button>
            <span className="min-w-0 truncate text-muted">
              {file
                ? `${file.name} · ${formatBytes(file.size)}`
                : "No local file selected"}
            </span>
          </div>

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? COPY.verify.verifying : COPY.verify.cta}
            </Button>
          </div>
        </form>

        <div className="mt-8" aria-live="polite">
          <VerifyOutcome outcome={outcome} />
        </div>
      </div>
    );
  },
});
