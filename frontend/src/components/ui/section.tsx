import type { ReactNode } from "react";

import { useReveal } from "./use-reveal";

type SectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

// Owns the section heading that was previously copy-pasted, identically, into
// all eight content components, and carries the scroll reveal.
export default function Section({ title, children, className }: SectionProps) {
  const ref = useReveal<HTMLElement>();

  return (
    <section ref={ref} data-reveal className={className}>
      <h2 className="font-inter-tight text-foreground mb-6 flex items-center gap-2.5 text-lg font-semibold">
        <span aria-hidden="true" className="bg-primary h-4 w-1 rounded-full" />
        {title}
      </h2>
      {children}
    </section>
  );
}
