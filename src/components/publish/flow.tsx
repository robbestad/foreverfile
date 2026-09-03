import { AuthorizeStep } from "@/components/publish/authorize-step";
import { ChooseStep } from "@/components/publish/choose-step";
import { ReviewStep } from "@/components/publish/review-step";
import { StepRail } from "@/components/publish/step-rail";
import {
  getBalance,
  quotePrice,
  uploadFile,
  type Amount,
} from "@/lib/arweave";
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
  progress: number | null;
  error: string | null;
};

const WritingProgress = create<WritingProps>({
  render() {
    const value = Math.round(this.props.progress ?? 0);
    return (
      <div>
        <h1 className="font-display mt-6 text-4xl leading-tight text-ink sm:text-5xl">
          {COPY.publish.writing}
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
    this.observe(wallet);
    this._fileGen = 0;
    this._loadedBalanceFor = null;
  },
  onUpdate() {
    const session = wallet.get();
    if (
      session.status === "unlocked" &&
      this._loadedBalanceFor !== session.address
    ) {
      this._loadedBalanceFor = session.address;
      void getBalance(session.address)
        .then((balance) => {
          this.setState({ ...this.state, balance });
        })
        .catch(() => {
          this.setState({ ...this.state, balance: undefined });
        });
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
      if (next.size === 0) {
        this.setState({
          ...this.state,
          file: null,
          sha256: null,
          hashing: false,
          fee: undefined,
          feeLoading: false,
          error: COPY.publish.emptyFile,
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
        const [nextHash, nextFee] = await Promise.all([
          sha256Blob(next),
          quotePrice(next.size),
        ]);
        if (gen !== this._fileGen) return;
        this.setState({
          ...this.state,
          file: next,
          sha256: nextHash,
          hashing: false,
          fee: nextFee,
          feeLoading: false,
          feeError: false,
        });
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
      const current = wallet.get();
      if (!this.state.file || current.status !== "unlocked") return;
      this.setState({
        ...this.state,
        error: null,
        step: "writing",
        progress: 0,
      });
      try {
        const item = await uploadFile(
          this.state.file,
          current.jwk,
          ({ pctComplete }) => {
            this.setState({ ...this.state, progress: pctComplete });
          },
        );
        navigate(`${recordPath(item.id)}?new=1`);
      } catch (err) {
        this.setState({
          ...this.state,
          error: err instanceof Error ? err.message : "Publishing failed.",
          progress: null,
          step: wallet.get().status === "unlocked" ? "authorize" : "review",
        });
      }
    };

    const onReviewContinue = () => {
      if (wallet.get().status === "unlocked") {
        void publish();
        return;
      }
      this.setState({ ...this.state, error: null, step: "authorize" });
    };

    const railIndex = step === "choose" ? 0 : step === "review" ? 1 : 2;

    return (
      <div>
        <StepRail current={railIndex} />

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
