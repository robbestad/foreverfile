import { ButtonLink } from "@/components/button";
import { PageShell } from "@/components/page-shell";
import { NetworkLocation, RecordActions } from "@/components/record-actions";
import { RecordSheet } from "@/components/record-sheet";
import { getRecord } from "@/lib/arweave";
import { COPY } from "@/lib/copy";
import {
  isRecordId,
  type ForeverFileRecord,
  type StampKind,
} from "@/lib/record";
import { SITE_NAME } from "@/lib/site";
import type { PageProps } from "@/types";
import { create } from "svenjs";

type RecordState = {
  status: "loading" | "missing" | "ready";
  record: ForeverFileRecord | null;
  newlyPublished: boolean;
};

function newlyFromSearch(search: string) {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get("new") === "1";
}

function applyRecordTitle(record: ForeverFileRecord) {
  if (typeof document === "undefined") return;
  document.title = `${record.name} · ${SITE_NAME}`;
}

export const RecordPage = create<PageProps, RecordState>({
  initialState(props) {
    return {
      status: "loading",
      record: null,
      newlyPublished: newlyFromSearch(props.search),
    };
  },
  onMount() {
    this._fetchGen = 0;
    this._load(this.props.params.id);
    if (this.state.newlyPublished && typeof history !== "undefined") {
      const params = new URLSearchParams(
        this.props.search.startsWith("?")
          ? this.props.search.slice(1)
          : this.props.search,
      );
      params.delete("new");
      const query = params.toString();
      history.replaceState(
        {},
        "",
        `${location.pathname}${query ? `?${query}` : ""}${location.hash}`,
      );
    }
  },
  onUpdate() {
    if (this._loadedId !== this.props.params.id) {
      this.setState({
        status: "loading",
        record: null,
        newlyPublished: newlyFromSearch(this.props.search),
      });
      this._load(this.props.params.id);
    }
  },
  _load(id: string) {
    this._loadedId = id;
    if (!isRecordId(id)) {
      this.setState({
        ...this.state,
        status: "missing",
        record: null,
      });
      return;
    }
    const gen = ++this._fetchGen;
    void getRecord(id)
      .then((record) => {
        if (gen !== this._fetchGen) return;
        if (!record) {
          this.setState({
            ...this.state,
            status: "missing",
            record: null,
          });
          return;
        }
        applyRecordTitle(record);
        this.setState({
          ...this.state,
          status: "ready",
          record,
        });
      })
      .catch(() => {
        if (gen !== this._fetchGen) return;
        this.setState({
          ...this.state,
          status: "missing",
          record: null,
        });
      });
  },
  render() {
    const { status, record, newlyPublished } = this.state;

    if (status === "loading") {
      return (
        <PageShell>
          <div className="rounded-2xl border border-rule/80 bg-panel/40 px-5 py-8 sm:px-7">
            <p className="text-muted">Looking up the record…</p>
          </div>
        </PageShell>
      );
    }

    if (status === "missing" || !record) {
      return (
        <PageShell>
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
            {COPY.record.notFoundTitle}
          </h1>
          <p className="mt-3 max-w-xl text-muted">{COPY.record.notFoundBody}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/verify">Verify</ButtonLink>
            <ButtonLink href="/publish" variant="ghost">
              {COPY.hero.primary}
            </ButtonLink>
          </div>
        </PageShell>
      );
    }

    const stamp: StampKind = newlyPublished
      ? "published"
      : record.timestamp
        ? "unchanged"
        : "pending";
    const recordStatus = newlyPublished
      ? COPY.record.publishedStatus
      : record.timestamp
        ? COPY.record.unchangedStatus
        : COPY.record.pendingStatus;

    return (
      <PageShell>
        <RecordSheet
          record={record}
          stamp={stamp}
          status={recordStatus}
          newlyPublished={newlyPublished}
        >
          <RecordActions id={record.id} />
        </RecordSheet>
        <NetworkLocation id={record.id} />
      </PageShell>
    );
  },
});
