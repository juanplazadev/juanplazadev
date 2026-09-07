import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
};

/**
 * A third-party console in the sidebar's Consoles menu, built server side by
 * App\Enums\Console. `id` names the case, which is what picks the icon.
 */
export type Console = {
    id: string;
    label: string;
    url: string;
};
