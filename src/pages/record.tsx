import { localReceipt } from "@/stores/upload";
import { Button, ButtonLink } from "@/components/button";
import { PageShell } from "@/components/page-shell";
import { NetworkLocation, RecordActions } from "@/components/record-actions";
import { RecordSheet } from "@/components/record-sheet";
import { registeredRecord } from "@/lib/registry";
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

const STATUS_POLL_INTERVAL = 15_000;

type RecordState = {
  status: "loading" | "missing" | "ready" | "pending" | "error";
  error?: string;
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
    this._destroyed = false;
    this._resume = () => {
      this._clearPoll();
      if (document.visibilityState !== "hidden" && this._needsPoll()) {
        this._load(this.props.params.id);
      }
    };
    document.addEventListener("visibilitychange", this._resume);
    window.addEventListener("pageshow", this._resume);
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
  onDestroy() {
    this._destroyed = true;
    this._fetchGen++;
    this._clearPoll();
    this._controller?.abort();
    document.removeEventListener("visibilitychange", this._resume);
    window.removeEventListener("pageshow", this._resume);
  },
  _clearPoll() {
    clearTimeout(this._pollTimer);
  },
  _needsPoll() {
    return this.state.record?.timestamp === null ||
      this.state.status === "pending" || this.state.status === "error";
  },
  _schedulePoll() {
    this._clearPoll();
    if (!this._destroyed && document.visibilityState !== "hidden" && this._needsPoll()) {
      // Schedule after completion so slow lookups never overlap.
      this._pollTimer = setTimeout(() => this._load(this.props.params.id), STATUS_POLL_INTERVAL);
    }
  },
  _load(id: string) {
    if (this._destroyed || (this._loadedId === id && this._inFlight)) return;
    this._clearPoll();
    const gen = ++this._fetchGen;
    this._controller?.abort();
    const controller = new AbortController();
    this._controller = controller;
    this._loadedId = id;
    this._inFlight = false;
    if (!isRecordId(id)) {
      this.setState({ ...this.state, status: "missing", record: null });
      return;
    }
    this._inFlight = true;
    const wasPending = this.state.status === "pending";
    const receipt = this.state.record?.id === id ? this.state.record : localReceipt(id);
    this.setState({ ...this.state, status: receipt ? "ready" : wasPending ? "pending" : "loading", record: receipt, error: undefined });
    const saved = receipt ? Promise.resolve(receipt) : registeredRecord(id, controller.signal).catch(() => null);
    void saved.then((record) => {
      if (gen !== this._fetchGen || !record || this.state.status !== "loading") return;
      applyRecordTitle(record);
      this.setState({ ...this.state, status: "ready", record });
    });
    void getRecord(id, controller.signal).then(async (result) => {
      if (gen !== this._fetchGen) return;
      const record = result.kind === "found" ? result.record : await saved;
      if (gen !== this._fetchGen) return;
      if (record) applyRecordTitle(record);
      this.setState({ ...this.state, status: record ? "ready" : result.kind === "pending" || wasPending ? "pending" : "missing", record });
    }).catch(async (error: unknown) => {
      const record = await saved;
      if (gen !== this._fetchGen) return;
      this.setState({ ...this.state, status: record ? "ready" : wasPending ? "pending" : "error", record,
        error: error instanceof Error ? error.message : "Could not look up the record." });
    }).finally(() => {
      if (gen !== this._fetchGen) return;
      this._inFlight = false;
      this._schedulePoll();
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

    if (status === "error" || status === "pending") {
      return <PageShell><h1>{status === "pending" ? "Publication pending" : "Could not look up the record"}</h1><p role="alert">{this.state.error ?? "The network is still processing this transaction."}</p><Button onClick={() => this._load(this.props.params.id)}>Try again</Button></PageShell>;
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

    const stamp: StampKind = record.timestamp !== null ? (newlyPublished ? "published" : "unchanged") : "pending";
    const recordStatus = record.timestamp !== null ? (newlyPublished ? COPY.record.publishedStatus : COPY.record.unchangedStatus) : COPY.record.pendingStatus;

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
        {this.state.error ? <p role="alert">{this.state.error}</p> : null}
        {record.timestamp === null || this.state.error ? <Button onClick={() => this._load(record.id)}>Check network status</Button> : null}
        <NetworkLocation id={record.id} />
      </PageShell>
    );
  },
});
