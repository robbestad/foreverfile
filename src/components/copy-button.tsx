import { Button } from "@/components/button";
import { create } from "svenjs";

type CopyButtonProps = {
  value: string;
  label: string;
  variant?: "primary" | "ghost" | "danger-outline";
  className?: string;
};

type CopyButtonState = {
  copied: boolean;
};

export const CopyButton = create<CopyButtonProps, CopyButtonState>({
  initialState: { copied: false },
  onDestroy() {
    if (this._timer) window.clearTimeout(this._timer);
  },
  render() {
    const { value, label, variant = "ghost", className = "" } = this.props;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(value);
        this.setState({ copied: true });
        if (this._timer) window.clearTimeout(this._timer);
        this._timer = window.setTimeout(() => {
          this.setState({ copied: false });
        }, 1500);
      } catch {
        this.setState({ copied: false });
      }
    };

    return (
      <Button
        type="button"
        variant={variant}
        onClick={copy}
        className={className}
        aria-label={this.state.copied ? "Copied" : label}
      >
        {this.state.copied ? "Copied" : label}
      </Button>
    );
  },
});
