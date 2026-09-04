import type { ReactNode } from 'react';
import { useId } from 'react';

type DiagramProps = {
    /** Announced in place of the drawing. Not shown. */
    title: string;
    /** The same information as prose, for anyone who cannot see the diagram. */
    description: string;
    /** viewBox dimensions. Author diagrams near 560 wide: the sheet gives the svg
     *  about 694px, so text sized in these units lands close to its rendered px. */
    width: number;
    height: number;
    /** Below this rendered width the panel scrolls instead of scaling the labels
     *  down past legibility. */
    minWidth?: number;
    caption?: ReactNode;
    children: ReactNode;
};

// The frame every diagram sits in. The scroll-rather-than-shrink behaviour is
// the same call prose.css already makes for <pre>: a wide diagram scrolls inside
// its own panel rather than pushing the page into a horizontal scroll.
//
// <title> and <desc> are wired up through aria-labelledby rather than left to be
// picked up implicitly - Safari and older screen readers do not reliably read a
// bare <title> on an SVG, and these diagrams carry information the prose around
// them does not repeat in full.
export default function Diagram({
    title,
    description,
    width,
    height,
    minWidth = 500,
    caption,
    children,
}: DiagramProps) {
    const id = useId();
    const titleId = `${id}-title`;
    const descId = `${id}-desc`;

    return (
        <figure>
            <div className="border-border bg-muted overflow-x-auto rounded-lg border p-4">
                <svg
                    role="img"
                    aria-labelledby={`${titleId} ${descId}`}
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-auto w-full"
                    style={{ minWidth }}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <title id={titleId}>{title}</title>
                    <desc id={descId}>{description}</desc>
                    {children}
                </svg>
            </div>
            {caption && (
                <figcaption className="text-muted-foreground mt-2 text-[13px]">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
