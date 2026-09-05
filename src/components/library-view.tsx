import { Button, ButtonLink } from "@/components/button";
import { KeyForm } from "@/components/key-form";
import { RecordRow } from "@/components/record-row";
import { listForeverfiles, type LibraryItem } from "@/lib/arweave";
import { COPY } from "@/lib/copy";
import { recordPath } from "@/lib/record";
import { lockWallet, wallet } from "@/stores/wallet";
import { create } from "svenjs";

type LibraryState = {
  records: LibraryItem[] | null;
  loading: boolean;
  error: string | null;
  cursor: string | null;
  hasNextPage: boolean;
};

export const LibraryView = create<Record<string, never>, LibraryState>({
  initialState: {
    records: null,
    cursor: null,
    hasNextPage: false,
    loading: false,
    error: null,
  },
  onMount() {
    this.observe(wallet);
    this._loadedFor = undefined;
    this._generation = 0;
    this._sync();
  },
  onUpdate() { this._sync(); },
  onDestroy() { this._generation++; this._controller?.abort(); },
  _sync() {
    const address = wallet.get().address;
    if (this._loadedFor === address) return;
    this._loadedFor = address;
    this._generation++;
    this._controller?.abort();
    this.setState({ records: null, loading: false, error: null, cursor: null, hasNextPage: false });
    if (address) this._load();
  },
  _load() {
    const address = wallet.get().address;
    if (!address || this.state.loading) return;
    const generation = ++this._generation;
    this._controller?.abort();
    const controller = new AbortController();
    this._controller = controller;
    this.setState({ ...this.state, loading: true, error: null });
    void listForeverfiles(address, this.state.cursor, controller.signal).then((page) => {
      if (generation !== this._generation || address !== wallet.get().address) return;
      const records = [...(this.state.records ?? [])];
      const ids = new Set(records.map((record) => record.id));
      for (const record of page.records) if (!ids.has(record.id)) { records.push(record); ids.add(record.id); }
      this.setState({ records, cursor: page.cursor, hasNextPage: page.hasNextPage, loading: false, error: null });
    }).catch((err: unknown) => {
      if (generation !== this._generation || address !== wallet.get().address) return;
      this.setState({ ...this.state, loading: false, error: err instanceof Error ? err.message : "Could not load records." });
    });
  },
  render() {
    const session = wallet.get();

    if (session.status === "locked") {
      return (
        <div>
          <h1 className="font-display text-4xl text-ink">Your records</h1>
          <p className="mt-3 max-w-xl text-muted">
            Use the same key you published with. ForeverFile does not keep an
            account.
          </p>
          <KeyForm submitLabel="Show records" />
        </div>
      );
    }

    const { records, loading, error } = this.state;

    return (
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-4xl text-ink">Your records</h1>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/publish">{COPY.hero.primary}</ButtonLink>
            <Button type="button" variant="ghost" onClick={lockWallet}>
              Lock key
            </Button>
          </div>
        </div>

        {loading ? <p className="mt-8 text-muted">Looking up records…</p> : null}
        {error ? <p role="alert" className="mt-8 text-stamp">{error}</p> : null}
        {!loading && !error && records?.length === 0 ? <p className="mt-8 text-muted">Nothing published with this key yet.</p> : null}
        {records && records.length > 0 ? (
          <ul className="mt-8 flex flex-col gap-3">
            {records.map((record) => (
              <li key={record.id}>
                <a href={recordPath(record.id)} className="block">
                  <RecordRow
                    record={record}
                    stamp={record.timestamp ? "unchanged" : "pending"}
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {error || this.state.hasNextPage ? <Button type="button" disabled={loading} onClick={() => this._load()}>{error ? "Try again" : "Load more"}</Button> : null}
      </div>
    );
  },
});
