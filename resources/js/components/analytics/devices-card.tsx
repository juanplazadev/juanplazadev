import { MonitorSmartphone } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import ShareBar from '@/components/admin/share-bar';
import type { ShareSegment } from '@/components/admin/share-bar';
import { deviceGlyph, deviceLabel } from '@/components/analytics/row-glyphs';
import type { AnalyticsRow } from '@/types/analytics';

/**
 * How the visits split across desktop, mobile and tablet.
 *
 * A part-to-whole bar rather than a fifth ranked list, for the reason
 * DeliveryBar gives: these two or three values partition the visits and sum to
 * the total, and a list of them makes the reader do the division. It is also
 * the only breakdown with a closed set of values, so unlike paths or referrers
 * there is never a tail the bar would misrepresent.
 *
 * Full width beneath the four lists. Five cards in a two-column grid leaves an
 * orphan, and a wide short strip is the shape this data actually wants.
 *
 * The device glyph stands in for the legend's colour dot here. Those five chart
 * tokens are steps of one accent ramp whose order inverts in dark mode, so they
 * separate these three badly on their own - the icon and the label are what
 * distinguish them, and the colour only ties each one back to the bar.
 */
const COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-5)'];

export default function DevicesCard({ rows }: { rows: AnalyticsRow[] }) {
    const segments: ShareSegment[] = rows.map((row, index) => ({
        key: row.label,
        label: deviceLabel(row.label),
        value: row.visits,
        color: COLORS[index % COLORS.length],
        icon: deviceGlyph(row.label, 'size-3.5'),
    }));

    return (
        <PanelCard
            title="Devices"
            icon={MonitorSmartphone}
            className="lg:col-span-2"
        >
            {rows.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                    Nothing yet.
                </p>
            ) : (
                <ShareBar segments={segments} showShare />
            )}
        </PanelCard>
    );
}
