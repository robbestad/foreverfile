import { Button } from "@/components/button";
import { COPY } from "@/lib/copy";
import { unlockWallet } from "@/stores/wallet";
import { create } from "svenjs";

type KeyFormProps = {
  submitLabel?: string;
};

type KeyFormState = {
  raw: string;
  fileName: string | null;
  error: string | null;
  pending: boolean;
};

export const KeyForm = create<KeyFormProps, KeyFormState>({
  initialState: {
    raw: "",
    fileName: null,
    error: null,
    pending: false,
  },
  render() {
    const submitLabel = this.props.submitLabel ?? "Authorize";
    const { raw, fileName, error, pending } = this.state;

    const onFile = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        this.setState({
          ...this.state,
          raw: text,
          fileName: file.name,
          error: null,
        });
      } catch {
        this.setState({ ...this.state, error: "Could not read that file." });
      }
    };

    const onSubmit = async (event: Event) => {
      event.preventDefault();
      this.setState({ ...this.state, error: null, pending: true });
      try {
        await unlockWallet(this.state.raw);
      } catch (err) {
        this.setState({
          ...this.state,
          pending: false,
          error: err instanceof Error ? err.message : "Could not authorize.",
        });
      }
    };

    return (
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label htmlFor="publication-key" className="text-xs text-muted">
          Publication key
        </label>
        <textarea
          id="publication-key"
          value={raw}
          onInput={(event: Event) => {
            const value = (event.target as HTMLTextAreaElement).value;
            this.setState({
              ...this.state,
              raw: value,
              fileName: null,
              error: null,
            });
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          rows={7}
          placeholder="Paste the key, or choose the key file."
          className="min-h-36 w-full resize-y rounded-2xl border border-rule bg-paper px-4 py-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-muted/50 focus:border-ink"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <input
              ref={(el: HTMLInputElement | null) => (this._fileInput = el)}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="hidden"
              tabIndex={-1}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => this._fileInput?.click()}
            >
              {COPY.publish.chooseKey}
            </Button>
            <span className="truncate">{fileName ?? "No file selected"}</span>
          </div>
          <Button type="submit" disabled={pending || !raw.trim()}>
            {pending ? "Authorizing…" : submitLabel}
          </Button>
        </div>
        <p className="text-sm text-muted">{COPY.publish.authorizeHelper}</p>
        {error ? (
          <p role="alert" className="text-sm text-stamp">
            {error}
          </p>
        ) : null}
      </form>
    );
  },
});
