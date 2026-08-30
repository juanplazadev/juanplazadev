import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  shimmer: "shimmer overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border bg-card text-foreground hover:border-primary/40 hover:text-primary",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
} as const;

const sizes = {
  sm: "px-3.5 py-1.5 text-sm",
  default: "px-4 py-2 text-sm",
} as const;

type BaseProps = {
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

// Renders an <a> when given an href, a <button> otherwise, with each branch
// typed to its own element's attributes.
type ButtonProps = BaseProps &
  (
    | ({ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  );

export default function Button({ children, variant = "default", size = "default", className, ...props }: ButtonProps) {
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap",
    "transition duration-150 ease-in-out outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    variants[variant],
    sizes[size],
    className,
  );

  if (props.href !== undefined) {
    return (
      <a className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
