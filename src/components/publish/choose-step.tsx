import { Button } from "@/components/button";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { formatBytes } from "@/lib/format";
import { formatFileIdentity } from "@/lib/hash";
import { FILE_SIZE_WARN_BYTES } from "@/lib/tags";
import { create } from "svenjs";

type ChooseStepProps = {
  file: File | null;
  sha256: string | null;
  hashing: boolean;
  dragOver: boolean;
  error: string | null;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
  onInput: (file: File | null) => void;
  onContinue: () => void;
  onClear: () => void;
};

export const ChooseStep = create<ChooseStepProps>({
  render() {
    const {
      file,
      sha256,
      hashing,
      dragOver,
      error,
      onDragOver,
      onDragLeave,
      onDrop,
      onInput,
      onContinue,
      onClear,
    } = this.props;
    const tooLarge = Boolean(file && file.size > FILE_SIZE_WARN_BYTES);

    return (
      <div>
        <h1 className="font-display mt-6 text-4xl leading-tight text-ink sm:text-5xl">
          {COPY.publish.chooseTitle}
        </h1>
        <p className="mt-3 max-w-xl text-muted">{COPY.publish.chooseBody}</p>

        <label
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative mt-8 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-4 py-12 text-center transition-colors duration-200",
            dragOver
              ? "border-ink bg-panel"
              : "border-rule bg-panel/30 hover:border-ink/40 hover:bg-panel/50",
          )}
        >
          <input
            type="file"
            className="absolute inset-0 z-10 cursor-pointer opacity-0 file:hidden"
            onChange={(event: Event) => {
              const input = event.target as HTMLInputElement;
              onInput(input.files?.[0] ?? null);
              input.value = "";
            }}
          />
          <span className="font-medium text-ink">{COPY.publish.dropLabel}</span>
          <span className="text-sm text-muted">{COPY.publish.dropHelper}</span>
        </label>

        {file ? (
          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-rule/80 bg-panel/40 px-5 py-5">
            <div className="col-span-2 min-w-0">
              <dt className="text-xs text-muted">File</dt>
              <dd className="mt-0.5 truncate text-ink">{file.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Size</dt>
              <dd className="mt-0.5 font-mono text-sm">
                {formatBytes(file.size)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Identity</dt>
              <dd className="mt-0.5 truncate font-mono text-sm">
                {hashing
                  ? "Computing…"
                  : sha256
                    ? formatFileIdentity(sha256, true)
                    : "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        {tooLarge ? (
          <p className="mt-4 text-sm text-pending">{COPY.publish.largeFile}</p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-stamp">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            disabled={!file || hashing || !sha256}
            onClick={onContinue}
          >
            {COPY.publish.continue}
          </Button>
          {file ? (
            <Button type="button" variant="ghost" onClick={onClear}>
              {COPY.publish.differentFile}
            </Button>
          ) : null}
        </div>
      </div>
    );
  },
});
