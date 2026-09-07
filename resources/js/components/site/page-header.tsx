import { Link } from '@inertiajs/react';

import PalettePicker from '@/components/palette-picker';
import ThemeToggle from '@/components/theme-toggle';
import Wordmark from '@/components/wordmark';
import { home } from '@/routes';

const BackIcon = () => (
    <svg
        className="stroke-current"
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M10 3 5 8l5 5" />
    </svg>
);

// The hero's top rail without the hero. Sub-pages get the same wordmark and
// appearance controls in the same place, so switching pages does not move the
// theme toggle out from under the cursor.
export default function PageHeader() {
    return (
        <header className="pt-6">
            <div className="flex items-center justify-between">
                <Link
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    href={home()}
                    prefetch="mount"
                >
                    <BackIcon />
                    <Wordmark className="text-sm" />
                </Link>
                <div className="flex items-center gap-2">
                    <PalettePicker />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
