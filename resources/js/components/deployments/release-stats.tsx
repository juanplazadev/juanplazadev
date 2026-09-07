import StatTile from '@/components/admin/stat-tile';
import { timeAgo } from '@/lib/time';
import type { ErrorRelease } from '@/types/deployments';

/**
 * How many releases the page asks Sentry for. Mirrors ErrorInsights::RELEASE_LIMIT.
 */
const RELEASE_LIMIT = 20;

/**
 * The three numbers the table makes you scan for.
 *
 * All of them are derived from props already on the page - no second request,
 * and nothing here that the rows below do not also contain. What the tiles add
 * is the totals: "how many new issues did the last twenty releases bring" is a
 * column addition a reader should not have to do.
 *
 * These sit BELOW the running verdict rather than above it, which is the one
 * place this page departs from its siblings. Traffic and errors read header ->
 * tiles -> detail, but on those pages the tiles are the summary. Here the
 * verdict is the page's question, and demoting it to make room for three counts
 * would sell the page's point for its consistency. Between the verdict and the
 * table, the tiles read as the table's own summary line.
 */
export default function ReleaseStats({
    releases,
}: {
    releases: ErrorRelease[];
}) {
    const latest = releases[0] ?? null;
    const newIssues = releases.reduce(
        (total, release) => total + release.newGroups,
        0,
    );

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
                label="Last deploy"
                value={latest?.deployedAt ? timeAgo(latest.deployedAt) : '—'}
                hint={latest ? latest.shortVersion : 'Nothing tagged yet'}
            />

            <StatTile
                label="New issues"
                value={newIssues.toLocaleString()}
                hint="Across the releases listed"
            />

            <StatTile
                label="Releases"
                value={releases.length.toLocaleString()}
                // Named rather than implied: the list is capped, and a bare
                // count at the cap reads as the whole history.
                hint={
                    releases.length >= RELEASE_LIMIT
                        ? `Most recent ${RELEASE_LIMIT}`
                        : 'All Sentry has tagged'
                }
            />
        </div>
    );
}
