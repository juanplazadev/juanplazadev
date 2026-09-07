<?php

declare(strict_types=1);

use App\Enums\AnalyticsRange;
use App\Enums\DeliveryStatus;
use App\Mail\ResumeDeliverySnapshot;
use App\Models\EmailEvent;
use App\Models\ResumeDelivery;
use Carbon\CarbonImmutable;

function deliverySnapshot(): ResumeDeliverySnapshot
{
    return resolve(ResumeDeliverySnapshot::class);
}

/**
 * The row as the page receives it, found by address.
 *
 * @return array<string, mixed>
 */
function deliveryRowFor(string $email, ?DeliveryStatus $status = null): array
{
    $rows = deliverySnapshot()->summary(AnalyticsRange::Last7Days, $status)['deliveries'];

    return collect($rows)->firstWhere('email', $email) ?? [];
}

// Deriving the status --------------------------------------------------------

test('each status is derived from the column that decides it', function (
    string $state,
    string $expected,
): void {
    ResumeDelivery::factory()->{$state}()->create(['email' => 'ada@example.com']);

    expect(deliveryRowFor('ada@example.com')['status'])->toBe($expected);
})->with([
    'nothing sent yet' => ['unchallenged', 'pending'],
    'handed to the provider' => ['sent', 'sent'],
    'confirmed by a webhook' => ['delivered', 'delivered'],
    'refused by turnstile' => ['blocked', 'blocked'],
]);

test('a request made while the challenge was off is pending, not blocked', function (): void {
    // turnstile_success null means "never asked" - an unconfigured secret
    // switches the challenge off end to end. That is a different fact from
    // Cloudflare having refused, and it must never render as Blocked.
    ResumeDelivery::factory()->unchallenged()->create(['email' => 'ada@example.com']);

    expect(deliveryRowFor('ada@example.com'))
        ->status->toBe('pending')
        ->turnstile->toBe('skipped');
});

test('a permanent bounce reads as failed rather than as delivered', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create(['email' => 'bo@example.com']);
    $delivery->markFailed('suppress-bounce');

    expect(deliveryRowFor('bo@example.com'))
        ->status->toBe('failed')
        ->failureReason->toBe('suppress-bounce');
});

// Totals against the filter --------------------------------------------------

test('the totals count the window while the table respects the status filter', function (): void {
    ResumeDelivery::factory()->count(3)->delivered()->create();
    ResumeDelivery::factory()->count(2)->blocked()->create();
    ResumeDelivery::factory()->sent()->create();

    $filtered = deliverySnapshot()->summary(AnalyticsRange::Last7Days, DeliveryStatus::Blocked);

    // Narrowing the tiles along with the table would leave the reader looking
    // at "2 blocked" with no idea whether that is two out of six or two of two.
    expect($filtered['deliveries'])->toHaveCount(2)
        ->and($filtered['totals'])->toMatchArray([
            'requested' => 6,
            'delivered' => 3,
            'blocked' => 2,
            'sent' => 1,
            'failed' => 0,
            'pending' => 0,
        ]);
});

test('the five statuses partition the window', function (): void {
    ResumeDelivery::factory()->delivered()->create();
    ResumeDelivery::factory()->sent()->create();
    ResumeDelivery::factory()->blocked()->create();
    ResumeDelivery::factory()->unchallenged()->create();
    ResumeDelivery::factory()->sent()->create()->markFailed('bounced');

    $totals = deliverySnapshot()->summary(AnalyticsRange::Last7Days)['totals'];

    // Every request lands in exactly one bucket. A row counted twice, or in
    // none, means the enum's SQL and its match() have drifted apart.
    expect($totals['delivered'] + $totals['sent'] + $totals['blocked']
        + $totals['pending'] + $totals['failed'])->toBe($totals['requested']);
});

test('a request older than the range is left out', function (): void {
    $old = ResumeDelivery::factory()->delivered()->create(['email' => 'old@example.com']);
    $old->forceFill(['created_at' => CarbonImmutable::now()->subDays(20)])->saveQuietly();

    ResumeDelivery::factory()->delivered()->create(['email' => 'new@example.com']);

    expect(deliverySnapshot()->summary(AnalyticsRange::Last7Days)['totals']['requested'])->toBe(1)
        ->and(deliverySnapshot()->summary(AnalyticsRange::Last30Days)['totals']['requested'])->toBe(2);
});

// The events timeline --------------------------------------------------------

test('every provider event is nested under its delivery, oldest first', function (): void {
    $delivery = ResumeDelivery::factory()->delivered()->create(['email' => 'ada@example.com']);

    EmailEvent::factory()->for($delivery)->create([
        'event' => 'opened',
        'occurred_at' => CarbonImmutable::now()->subMinute(),
    ]);
    EmailEvent::factory()->for($delivery)->create([
        'event' => 'accepted',
        'occurred_at' => CarbonImmutable::now()->subHour(),
    ]);

    // Not just the two the webhook acts on: `opened`, `clicked` and
    // `complained` are stored too, and this timeline is the only place they
    // are ever visible.
    expect(deliveryRowFor('ada@example.com')['events'])->toHaveCount(2)
        ->and(deliveryRowFor('ada@example.com')['events'][0]['event'])->toBe('accepted')
        ->and(deliveryRowFor('ada@example.com')['events'][1]['event'])->toBe('opened');
});

test('a bounce carries its severity and reason into the timeline', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create(['email' => 'bo@example.com']);
    EmailEvent::factory()->for($delivery)->permanentFailure()->create();

    expect(deliveryRowFor('bo@example.com')['events'][0])
        ->event->toBe('failed')
        ->severity->toBe('permanent')
        ->reason->toBe('suppress-bounce');
});

// Truncation -----------------------------------------------------------------

test('the list is capped while the totals still report every request', function (): void {
    ResumeDelivery::factory()->count(ResumeDeliverySnapshot::RECENT_LIMIT + 3)->delivered()->create();

    $summary = deliverySnapshot()->summary(AnalyticsRange::Last7Days);

    // A truncated list must never make the tiles above it lie.
    expect($summary['deliveries'])->toHaveCount(ResumeDeliverySnapshot::RECENT_LIMIT)
        ->and($summary['totals']['requested'])->toBe(ResumeDeliverySnapshot::RECENT_LIMIT + 3);
});

// The overview's half ---------------------------------------------------------

test('the overview half carries the totals and when the last request came in', function (): void {
    ResumeDelivery::factory()->delivered()->create();

    $overview = deliverySnapshot()->overview(AnalyticsRange::Last7Days);

    expect($overview['totals']['requested'])->toBe(1)
        ->and($overview['lastRequestedAt'])->not->toBeNull()
        ->and($overview)->not->toHaveKey('deliveries');
});

test('the overview half reports no last request when there has never been one', function (): void {
    expect(deliverySnapshot()->overview(AnalyticsRange::Last7Days))
        ->lastRequestedAt->toBeNull()
        ->and(deliverySnapshot()->overview(AnalyticsRange::Last7Days)['totals']['requested'])->toBe(0);
});
