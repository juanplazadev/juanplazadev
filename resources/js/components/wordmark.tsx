import { cn } from '@/lib/utils';

type WordmarkProps = {
    /** `monogram` for tight rails - a collapsed sidebar, a mobile sheet. */
    variant?: 'full' | 'monogram';
    className?: string;
};

// The brand mark as text, not an SVG. `text-primary` on the second half is what
// makes it track the palette picker - a baked-in colour would not.
export default function Wordmark({
    variant = 'full',
    className,
}: WordmarkProps) {
    return (
        <span
            className={cn(
                'font-inter-tight text-foreground font-semibold tracking-tight',
                className,
            )}
        >
            {variant === 'monogram' ? (
                <>
                    J<span className="text-primary">P</span>
                </>
            ) : (
                <>
                    juanplaza<span className="text-primary">.dev</span>
                </>
            )}
        </span>
    );
}
