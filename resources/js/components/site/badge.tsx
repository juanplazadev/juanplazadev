import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const variants = {
    secondary: 'border-border bg-muted text-foreground',
    outline: 'border-border bg-card text-muted-foreground',
    accent: 'border-primary/25 bg-accent text-accent-foreground',
} as const;

type BadgeProps = {
    children: ReactNode;
    variant?: keyof typeof variants;
    className?: string;
};

export default function Badge({
    children,
    variant = 'secondary',
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium',
                variants[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}
