/**
 * The panel's "nothing to draw" state.
 *
 * Deliberately the same card for an outage and for an honestly empty window: in
 * both cases the panel has no numbers, and the sentence passed in is what
 * distinguishes them. Dashed rather than solid so it does not read as data.
 */
export default function EmptyCard({ message }: { message: string }) {
    return (
        <div className="border-border bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            {message}
        </div>
    );
}
