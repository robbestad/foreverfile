import { Button } from "@/components/button";
import { RecordRow } from "@/components/record-row";
import { GATEWAY_URL, recentForeverfiles } from "@/lib/arweave";
import { recordPath, type ForeverFileRecord } from "@/lib/record";
import { create } from "svenjs";

type RecentRecordsState = {
  records: ForeverFileRecord[];
  loading: boolean;
  error: string | null;
};

export const RecentRecords = create<Record<string, never>, RecentRecordsState>({
  initialState: { records: [], loading: true, error: null },
  onMount() {
    this._load();
  },
  onDestroy() {
    this._controller?.abort();
  },
  async _load() {
    this._controller?.abort();
    const controller = new AbortController();
    this._controller = controller;
    this.setState({ ...this.state, loading: true, error: null });
    try {
      const records = await recentForeverfiles(controller.signal);
      if (controller.signal.aborted) return;
      this.setState({ records, loading: false, error: null });
    } catch (error) {
      if (controller.signal.aborted) return;
      this.setState({
        ...this.state,
        loading: false,
        error: error instanceof Error ? error.message : "Could not load public records.",
      });
    }
  },
  render() {
    const { records, loading, error } = this.state;
    return (
      <section className="mt-16 sm:mt-20" aria-labelledby="recent-records-title">
        <h2 id="recent-records-title" className="text-sm font-medium text-muted">
          Recently published
        </h2>
        <p className="mt-2 text-sm text-muted">Public files published with ForeverFile.</p>
        <div aria-live="polite" className="mt-4">
          {loading ? <p className="text-sm text-muted">Looking up public records…</p> : null}
          {error ? (
            <div>
              <p role="alert" className="mb-3 text-sm text-stamp">{error}</p>
              <Button type="button" variant="ghost" onClick={() => void this._load()}>Try again</Button>
            </div>
          ) : null}
          {!loading && !error && records.length === 0 ? (
            <p className="text-sm text-muted">
              No public ForeverFile records are indexed yet. Published files appear here once the network indexes them.
            </p>
          ) : null}
          {records.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {records.map((record) => (
                <li key={record.id}>
                  <a href={recordPath(record.id)} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4">
                    <RecordRow record={record} stamp={record.timestamp !== null ? "public" : "pending"} />
                  </a>
                  <a
                    href={`${GATEWAY_URL}/${record.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-muted underline underline-offset-4 hover:text-ink"
                    aria-label={`Open ${record.name} on Arweave`}
                  >
                    Open file on Arweave ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  },
});
