import type { ReactNode } from 'react';

import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';

export default function Field({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {hint && (
                <p className="text-muted-foreground -mt-1 text-xs">{hint}</p>
            )}
            {children}
            <InputError message={error} />
        </div>
    );
}
