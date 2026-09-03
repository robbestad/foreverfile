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
};

export const LibraryView = create<Record<string, never>, LibraryState>({
  initialState: {
    records: null,
    loading: false,
    error: null,
  },
  onMount() {
    this.observe(wallet);
    this._loadedFor = null;
  },
  onUpdate() {
    const session = wallet.get();
    if (session.status !== "unlocked") {
      this._loadedFor = null;
      return;
    }
    if (this._loadedFor === session.address) return;
    this._loadedFor = session.address;
    this.setState({ ...this.state, loading: true, error: null, records: null });
    void listForeverfiles(session.address)
      .then((records) => {
        if (wallet.get().status !== "unlocked") return;
        this.setState({
          ...this.state,
          records,
          loading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        this.setState({
          ...this.state,
          loading: false,
          records: null,
          error:
            err instanceof Error ? err.message : "Could not load records.",
        });
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

        {loading || (records === null && !error) ? (
          <p className="mt-8 text-muted">Looking up records…</p>
        ) : error ? (
          <p role="alert" className="mt-8 text-stamp">
            {error}
          </p>
        ) : records === null || records.length === 0 ? (
          <p className="mt-8 text-muted">Nothing published with this key yet.</p>
        ) : (
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
        )}
      </div>
    );
  },
});
