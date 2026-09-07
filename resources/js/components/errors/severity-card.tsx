import { Thermometer } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import ShareBar from '@/components/admin/share-bar';
import type { ShareSegment } from '@/components/admin/share-bar';
import {
    LEVEL_ORDER,
    levelColor,
    levelGlyph,
    levelLabel,
} from '@/components/errors/level-glyphs';
import type { ErrorIssue } from '@/types/errors';

/**
 * How the unresolved issues split across Sentry's levels.
 *
 * A part-to-whole bar rather than a sixth ranked list, for the reason DeliveryBar
 * gives: every issue is at exactly one level, so these counts partition the
 * "Unresolved" tile above and a list of them would leave the reader working out
 * the remainder. It also reads as the legend to the issue list beneath it - the
 * same glyphs, named once at the top rather than inferred from a column of them.
 *
 * Counted by issue, not by event. The tile directly above reports issues, so the
 * bar sums to a number already on the page; weighting by `count` would let one
 * issue firing a thousand times an hour swallow the bar, and the volume of
 * events is what the chart above already draws.
 *
 * Levels are ranked by severity rather than by size, which is the one thing this
 * card can say that a ranking cannot: a single fatal belongs at the left-hand
 * end of the bar however few of them there are.
 */
export default function SeverityCard({ issues }: { issues: ErrorIssue[] }) {
    // An empty card above an already-empty list says nothing twice.
    if (issues.length === 0) {
        return null;
    }

    return (
        <PanelCard title="Severity" icon={Thermometer}>
            <ShareBar segments={segments(issues)} showShare />
        </PanelCard>
    );
}

function segments(issues: ErrorIssue[]): ShareSegment[] {
    const counts = new Map<string, number>();

    for (const issue of issues) {
        const level = issue.level.toLowerCase();

        counts.set(level, (counts.get(level) ?? 0) + 1);
    }

    return [...counts.entries()]
        .sort(([a], [b]) => rank(a) - rank(b))
        .map(([level, value]) => ({
            key: level,
            label: levelLabel(level),
            value,
            color: levelColor(level),
            icon: levelGlyph(level, 'size-3.5'),
        }));
}

/** Anything Sentry adds to the set sorts after the levels we know, in one block. */
function rank(level: string): number {
    const index = LEVEL_ORDER.indexOf(level);

    return index === -1 ? LEVEL_ORDER.length : index;
}
