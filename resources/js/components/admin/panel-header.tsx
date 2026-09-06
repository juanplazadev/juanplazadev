import type { ReactNode } from 'react';

type PanelHeaderProps = {
    title: string;
    /** What the numbers are and where they came from. */
    subtitle?: string;
    /** The right-hand slot: a range picker, a link, nothing. */
    children?: ReactNode;
};

/** The title block every section page opens with. */
export default function PanelHeader({
    title,
    subtitle,
    children,
}: PanelHeaderProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 className="text-foreground font-display text-lg font-semibold">
                    {title}
                </h2>
                {subtitle ? (
                    <p className="text-muted-foreground text-xs">{subtitle}</p>
                ) : null}
            </div>

            {children}
        </div>
    );
}
