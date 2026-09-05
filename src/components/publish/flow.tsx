import { AuthorizeStep } from "@/components/publish/authorize-step";
import { ChooseStep } from "@/components/publish/choose-step";
import { ReviewStep } from "@/components/publish/review-step";
import { StepRail } from "@/components/publish/step-rail";
import {
  getBalance,
  quotePrice,
  checkFileSize,
  type Amount,
} from "@/lib/arweave";
import { Button } from "@/components/button";
import { upload, prepareUpload, resumeUpload, endUpload, hasUnfinishedUpload } from "@/stores/upload";
import { COPY } from "@/lib/copy";
import { sha256Blob } from "@/lib/hash";
import { recordPath } from "@/lib/record";
import { navigate } from "@/router";
import { wallet } from "@/stores/wallet";
import { create } from "svenjs";

type Step = "choose" | "review" | "authorize" | "writing";

const emptyAcks = {
  isPublic: false,
  irreversible: false,
  notPrivate: false,
};

type FlowState = {
  step: Step;
  file: File | null;
  sha256: string | null;
  hashing: boolean;
  dragOver: boolean;
  acks: typeof emptyAcks;
  progress: number | null;
  error: string | null;
  fee: Amount | undefined;
  feeLoading: boolean;
  feeError: boolean;
  balance: Amount | undefined;
};

const initial: FlowState = {
  step: "choose",
  file: null,
  sha256: null,
  hashing: false,
  dragOver: false,
  acks: emptyAcks,
  progress: null,
  error: null,
  fee: undefined,
  feeLoading: false,
  feeError: false,
  balance: undefined,
};

type WritingProps = {
  title?: string;
  progress: number | null;
  error: string | null;
};

const WritingProgress = create<WritingProps>({
  render() {
    const value = Math.round(this.props.progress ?? 0);
    return (
      <div>
        <h1 className="font-display mt-6 text-4xl leading-tight text-ink sm:text-5xl">
          {this.props.title ?? COPY.publish.writing}
        </h1>
        <p className="mt-3 text-muted">
          Signed here, then written as a public record.
        </p>
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>Progress</span>
            <span className="font-mono">{value}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-rule"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
          >
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-200"
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          </div>
        </div>
        {this.props.error ? (
          <p role="alert" className="mt-6 text-sm text-stamp">
            {this.props.error}
          </p>
        ) : null}
      </div>
    );
  },
});

export const PublishFlow = create<Record<string, never>, FlowState>({
  initialState: initial,
  onMount() {
    this._alive = true;
    this._fileGen = 0;
    this._balanceGen = 0;
    this._loadedBalanceFor = undefined;
    this._following = hasUnfinishedUpload();
    this.observe(wallet);
    this.observe(upload);
    this._sync();
  },
  onUpdate() { this._sync(); },
  onDestroy() {
    this._alive = false;
    this._fileGen++;
    this._balanceGen++;
    this._priceController?.abort();
    this._balanceController?.abort();
  },
  _sync() {
    const address = wallet.get().address;
    if (this._loadedBalanceFor !== address) {
      this._loadedBalanceFor = address;
      this._balanceGen++;
      this._balanceController?.abort();
      this.setState({ ...this.state, balance: undefined });
      if (address) this._loadBalance();
    }
    const transfer = upload.get();
    if (this._following && transfer.status === "complete" && transfer.record && location.pathname === "/publish") {
      this._following = false;
      navigate(`${recordPath(transfer.record.id)}?new=1`);
    }
    if (transfer.status === "complete" && this.state.file) this.setState({ ...initial });
  },
  _loadBalance() {
    const address = wallet.get().address;
    if (!address) return;
    const generation = ++this._balanceGen;
    this._balanceController?.abort();
    const controller = new AbortController();
    this._balanceController = controller;
    void getBalance(address, controller.signal).then((balance) => {
      if (!this._alive || generation !== this._balanceGen || wallet.get().address !== address) return;
      this.setState({ ...this.state, balance });
    }).catch(() => {
      if (!this._alive || generation !== this._balanceGen || wallet.get().address !== address) return;
      this.setState({ ...this.state, balance: undefined });
    });
  },
  async _quote(file: File, generation: number) {
    this._priceController?.abort();
    const controller = new AbortController();
    this._priceController = controller;
    this.setState({ ...this.state, feeLoading: true, feeError: false });
    try {
      const fee = await quotePrice(file.size, controller.signal);
      if (!this._alive || generation !== this._fileGen || controller.signal.aborted) return;
      this.setState({ ...this.state, fee, feeLoading: false, feeError: false });
    } catch {
      if (!this._alive || generation !== this._fileGen || controller.signal.aborted) return;
      this.setState({ ...this.state, fee: undefined, feeLoading: false, feeError: true });
    }
  },
  render() {
    const session = wallet.get();
    const {
      step,
      file,
      sha256,
      hashing,
      dragOver,
      acks,
      progress,
      error,
      fee,
      feeLoading,
      feeError,
      balance,
    } = this.state;

    const takeFile = async (next: File | null) => {
      const gen = ++this._fileGen;
      this._priceController?.abort();
      this.setState({
        ...this.state,
        error: null,
        acks: emptyAcks,
        progress: null,
        fee: undefined,
        feeError: false,
      });
      if (!next) {
        this.setState({
          ...this.state,
          file: null,
          sha256: null,
          hashing: false,
          fee: undefined,
          feeLoading: false,
          feeError: false,
          error: null,
          acks: emptyAcks,
          progress: null,
        });
        return;
      }
      if (next.size === 0 || next.size > 25 * 1024 * 1024) {
        this.setState({
          ...this.state,
          file: null,
          sha256: null,
          hashing: false,
          fee: undefined,
          feeLoading: false,
          error: next.size === 0 ? COPY.publish.emptyFile : "Files must be 25 MiB or smaller.",
          acks: emptyAcks,
          progress: null,
        });
        return;
      }
      this.setState({
        ...this.state,
        file: next,
        sha256: null,
        hashing: true,
        error: null,
        acks: emptyAcks,
        progress: null,
        fee: undefined,
        feeLoading: true,
        feeError: false,
      });
      try {
        checkFileSize(next.size);
        const nextHash = await sha256Blob(next);
        if (gen !== this._fileGen) return;
        this.setState({
          ...this.state,
          file: next,
          sha256: nextHash,
          hashing: false,
          fee: undefined,
          feeLoading: false,
          feeError: false,
        });
        void this._quote(next, gen);
      } catch {
        if (gen !== this._fileGen) return;
        this.setState({
          ...this.state,
          file: null,
          sha256: null,
          hashing: false,
          fee: undefined,
          feeLoading: false,
          feeError: true,
          error: "Could not compute a file identity.",
        });
      }
    };

    const publish = async () => {
      const { file, acks, sha256, fee, feeLoading } = this.state;
      if (!file || !sha256 || !fee || feeLoading) return;
      try {
        if (hasUnfinishedUpload()) throw new Error("Resume or end the existing upload first.");
        if (!acks.isPublic || !acks.irreversible || !acks.notPrivate) throw new Error("Confirm all publication consequences first.");
        this._following = true;
        this.setState({ ...this.state, error: null });
        await prepareUpload(file, acks);
        // Ready status exposes the ID before the user starts the first transfer.
      } catch (err) {
        if (!this._alive) return;
        this._following = false;
        this.setState({ ...this.state, error: err instanceof Error ? err.message : "Publishing failed." });
      }
    };

    const onReviewContinue = () => {
      if (wallet.get().status === "unlocked") {
        void publish();
        return;
      }
      this.setState({ ...this.state, error: null, step: "authorize" });
    };

    const transfer = upload.get();
    if (hasUnfinishedUpload() || transfer.status === "complete") {
      return <div>
        <WritingProgress title={transfer.status === "complete" ? "Publication received" : transfer.status === "preparing" ? "Preparing publication…" : transfer.status === "ready" ? "Ready to publish" : transfer.status === "error" ? "Transfer paused" : COPY.publish.writing} progress={transfer.progress} error={transfer.error} />
        <p className="mt-4">{transfer.status === "preparing" ? "Preparing and signing…" : transfer.status === "complete" ? "Received by the network. Confirmation is pending." : transfer.status === "ready" ? "Signed and ready to send." : transfer.status === "error" ? "Transfer paused." : "Sending to the network…"}</p>
        {transfer.record ? <p className="mt-4 break-all font-mono"><a href={recordPath(transfer.record.id)}>{transfer.record.id}</a></p> : null}
        {transfer.status === "ready" || transfer.status === "error" ? <Button type="button" onClick={() => { this._following = true; void resumeUpload(); }}>{transfer.status === "ready" ? "Send signed transaction" : "Resume same transaction"}</Button> : null}
        {transfer.status !== "complete" ? <p className="mt-4 text-sm text-muted">Ending this session cannot undo any bytes already sent. Retrying a new publication could charge another fee.</p> : null}
        <Button type="button" variant="ghost" onClick={() => { this._following = false; endUpload(); this.setState({ ...initial }); }}>{transfer.status === "complete" ? "Publish another file" : "End session and release file"}</Button>
      </div>;
    }

    const railIndex = step === "choose" ? 0 : step === "review" ? 1 : 2;

    return (
      <div>
        <StepRail current={railIndex} />
        {error && step === "authorize" ? <p role="alert" className="mt-4 text-stamp">{error}</p> : null}
        {file && sha256 ? <Button type="button" variant="ghost" disabled={feeLoading} onClick={() => { void this._quote(file, this._fileGen); this._loadBalance(); }}>Refresh fee and balance</Button> : null}
        {session.status === "unlocked" && !balance ? <p className="mt-4 text-muted">Balance unavailable. Refresh to try again.</p> : null}

        {step === "choose" ? (
          <ChooseStep
            file={file}
            sha256={sha256}
            hashing={hashing}
            dragOver={dragOver}
            error={error}
            onDragOver={(event: DragEvent) => {
              event.preventDefault();
              this.setState({ ...this.state, dragOver: true });
            }}
            onDragLeave={() => this.setState({ ...this.state, dragOver: false })}
            onDrop={(event: DragEvent) => {
              event.preventDefault();
              this.setState({ ...this.state, dragOver: false });
              void takeFile(event.dataTransfer?.files?.[0] ?? null);
            }}
            onInput={(next) => {
              void takeFile(next);
            }}
            onContinue={() => {
              this.setState({ ...this.state, error: null, step: "review" });
            }}
            onClear={() => {
              void takeFile(null);
            }}
          />
        ) : null}

        {step === "review" && file && sha256 ? (
          <ReviewStep
            file={file}
            sha256={sha256}
            fee={fee}
            feeLoading={feeLoading}
            feeError={feeError}
            balance={balance}
            authorized={session.status === "unlocked"}
            acks={acks}
            onAck={(key, value) =>
              this.setState({
                ...this.state,
                acks: { ...this.state.acks, [key]: value },
              })
            }
            onBack={() => {
              this.setState({ ...this.state, error: null, step: "choose" });
            }}
            onContinue={onReviewContinue}
            error={error}
          />
        ) : null}

        {step === "authorize" || step === "writing" ? (
          step === "writing" ? (
            <WritingProgress progress={progress} error={error} />
          ) : (
            <AuthorizeStep
              onBack={() => {
                this.setState({ ...this.state, error: null, step: "review" });
              }}
              onPublish={() => {
                void publish();
              }}
              pendingWrite={false}
            />
          )
        ) : null}
      </div>
    );
  },
});
