import { Button } from "@/components/button";
import { KeyForm } from "@/components/key-form";
import { COPY } from "@/lib/copy";
import { truncateAddress } from "@/lib/format";
import { lockWallet, wallet } from "@/stores/wallet";
import { create } from "svenjs";

type AuthorizeStepProps = {
  onBack: () => void;
  onPublish: () => void;
  pendingWrite: boolean;
};

export const AuthorizeStep = create<AuthorizeStepProps>({
  onMount() {
    this.observe(wallet);
  },
  render() {
    const { onBack, onPublish, pendingWrite } = this.props;
    const session = wallet.get();

    if (session.status === "unlocked") {
      return (
        <div>
          <h1 className="font-display mt-6 text-4xl leading-tight text-ink sm:text-5xl">
            {COPY.publish.authorizeTitle}
          </h1>
          <p className="mt-3 max-w-xl text-muted">{COPY.publish.authorizeBody}</p>
          <p className="mt-6 font-mono text-sm text-ink" title={session.address}>
            {truncateAddress(session.address, 8)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={onPublish} disabled={pendingWrite}>
              {pendingWrite ? COPY.publish.writing : COPY.publish.publishCta}
            </Button>
            <Button type="button" variant="ghost" onClick={lockWallet}>
              Lock key
            </Button>
            <Button type="button" variant="ghost" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h1 className="font-display mt-6 text-4xl leading-tight text-ink sm:text-5xl">
          {COPY.publish.authorizeTitle}
        </h1>
        <p className="mt-3 max-w-xl text-muted">{COPY.publish.authorizeBody}</p>
        <KeyForm />
        <button
          type="button"
          onClick={onBack}
          className="mt-5 text-sm text-muted hover:text-ink"
        >
          Back
        </button>
      </div>
    );
  },
});
