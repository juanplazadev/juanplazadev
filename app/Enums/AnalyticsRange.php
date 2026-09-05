<?php

declare(strict_types=1);

namespace App\Enums;

use Carbon\CarbonImmutable;

/**
 * The windows the dashboard offers, and the only place their bounds are computed.
 *
 * Cloudflare keeps unsampled beacon data for seven days and aggregates older
 * rows down to roughly ten percent, so the two ranges are not equivalent in
 * accuracy: 7d is exact, 30d is an estimate. That is the reason the enum stops
 * at thirty days rather than offering a year of history nobody can trust.
 */
enum AnalyticsRange: string
{
    case Last7Days = '7d';
    case Last30Days = '30d';

    public static function default(): self
    {
        return self::Last7Days;
    }

    public function startsAt(): CarbonImmutable
    {
        return $this->endsAt()->subDays($this->days());
    }

    public function endsAt(): CarbonImmutable
    {
        return CarbonImmutable::now('UTC');
    }

    public function days(): int
    {
        return match ($this) {
            self::Last7Days => 7,
            self::Last30Days => 30,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Last7Days => 'Last 7 days',
            self::Last30Days => 'Last 30 days',
        };
    }

    /**
     * Whole-day bounds for the zone datasets, which filter on `date`, not `datetime`.
     *
     * @return array{start: string, end: string}
     */
    public function toDateFilter(): array
    {
        return [
            'start' => $this->startsAt()->format('Y-m-d'),
            'end' => $this->endsAt()->format('Y-m-d'),
        ];
    }

    /**
     * Cloudflare rejects anything that is not RFC 3339 with an explicit zone,
     * and matches nothing at all when the upper bound is left at midnight of
     * the current day. Both bounds are therefore built here, never by hand.
     *
     * @return array{start: string, end: string}
     */
    public function toFilter(): array
    {
        return [
            'start' => $this->startsAt()->format('Y-m-d\TH:i:s\Z'),
            'end' => $this->endsAt()->format('Y-m-d\TH:i:s\Z'),
        ];
    }
}
