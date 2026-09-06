import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import PanelCard from '@/components/admin/panel-card';

type SectionCardProps = {
    title: string;
    /** Where the full version of this lives. */
    href: string;
    linkLabel: string;
    children: ReactNode;
};

/**
 * An overview card that is also a doorway.
 *
 * Every card on the overview is a condensed reading of a page that shows the
 * whole thing, so each one carries the link rather than leaving the reader to
 * find it in the sidebar.
 */
export default function SectionCard({
    title,
    href,
    linkLabel,
    children,
}: SectionCardProps) {
    return (
        <PanelCard
            title={title}
            action={
                <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                    {linkLabel}
                    <ArrowRight className="size-3" />
                </Link>
            }
            className="flex flex-col"
        >
            {children}
        </PanelCard>
    );
}
