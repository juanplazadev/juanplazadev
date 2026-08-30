import type { ReactNode } from "react";

import { cn } from "./cn";

type CardProps = {
  children: ReactNode;
  /** "beam" adds the travelling border light — reserve it for one card. */
  variant?: "default" | "beam";
  /** Lifts on hover. For cards that are themselves a link. */
  interactive?: boolean;
  className?: string;
};

export default function Card({ children, variant = "default", interactive = false, className }: CardProps) {
  return (
    <article
      className={cn(
        // Uniform on every card. The template gave a background to odd children
        // only, which left every second card bare.
        "border-border bg-card relative rounded-lg border p-5 transition duration-300",
        interactive && "hover:border-primary/40 hover:shadow-primary/5 hover:-translate-y-0.5 hover:shadow-lg",
        variant === "beam" && "border-beam",
        className,
      )}
    >
      {children}
    </article>
  );
}
