import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PanelCardProps = {
    /** The small uppercase heading. Omit for a card that titles itself. */
    title?: ReactNode;
    /** Sits opposite the title on the same line - a link, a count, a badge. */
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
};

/**
 * The one card shell the admin panel uses.
 *
 * Six components hand-rolled these exact classes before there were four pages
 * to keep in step. ui/card.tsx stays unused here on purpose: it brings a header
 * and footer structure these panels never wanted, and the whole shell is one
 * border and a radius.
 */
export default function PanelCard({
    title,
    action,
    children,
    className,
}: PanelCardProps) {
    return (
        <div
            className={cn(
                'border-border bg-card rounded-xl border p-4',
                className,
            )}
        >
            {title || action ? (
                <div className="flex items-start justify-between gap-3">
                    {title ? (
                        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            {title}
                        </h3>
                    ) : (
                        <span />
                    )}
                    {action}
                </div>
            ) : null}

            {children}
        </div>
    );
}
