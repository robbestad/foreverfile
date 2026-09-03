import { cn } from "@/lib/cn";
import { create } from "svenjs";

const variants = {
  primary: "bg-ink text-paper hover:bg-ink/90 disabled:hover:bg-ink",
  ghost:
    "border border-rule bg-paper text-ink hover:border-ink/40 hover:bg-panel disabled:hover:border-rule disabled:hover:bg-paper",
  "danger-outline": "border border-stamp/40 text-stamp hover:bg-stamp/5",
} as const;

const shared =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40";

type Variant = keyof typeof variants;

type ButtonProps = {
  variant?: Variant;
  className?: string;
  children?: unknown;
  type?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  [key: string]: unknown;
};

export const Button = create<ButtonProps>({
  render() {
    const { variant = "primary", className, children, ...props } = this.props;
    return (
      <button className={cn(shared, variants[variant], className)} {...props}>
        {children}
      </button>
    );
  },
});

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  className?: string;
  children?: unknown;
};

export const ButtonLink = create<ButtonLinkProps>({
  render() {
    const { href, variant = "primary", className, children } = this.props;
    return (
      <a href={href} className={cn(shared, variants[variant], className)}>
        {children}
      </a>
    );
  },
});
