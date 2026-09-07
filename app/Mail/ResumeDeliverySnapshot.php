<?php

declare(strict_types=1);

namespace App\Mail;

use App\Enums\AnalyticsRange;
use App\Enums\DeliveryStatus;
use App\Models\EmailEvent;
use App\Models\ResumeDelivery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;

/**
 * Who asked for the résumé, and what the provider did about it.
 *
 * The panel's second non-vendor source, and it reads like App\Content\ContentSnapshot
 * rather than like its Cloudflare and Sentry siblings on purpose: Mailgun has
 * already told us everything it knows through the webhook, so the answer is a
 * handful of indexed aggregates against two local tables. No API client, no
 * cache, no `error` string - there is no request here that can fail.
 *
 * @phpstan-type DeliveryTotals array{
 *     requested: int, sent: int, delivered: int, failed: int, blocked: int, pending: int,
 * }
 * @phpstan-type DeliveryEventRow array{
 *     event: string, occurredAt: string, severity: string|null, reason: string|null,
 * }
 * @phpstan-type DeliveryRow array{
 *     uuid: string,
 *     email: string,
 *     status: string,
 *     statusLabel: string,
 *     turnstile: string,
 *     requestedAt: string,
 *     sentAt: string|null,
 *     deliveredAt: string|null,
 *     failureReason: string|null,
 *     messageId: string|null,
 *     events: list<DeliveryEventRow>,
 * }
 * @phpstan-type DeliverySummary array{
 *     label: string,
 *     limit: int,
 *     totals: DeliveryTotals,
 *     deliveries: list<DeliveryRow>,
 * }
 * @phpstan-type DeliveryOverview array{
 *     totals: DeliveryTotals,
 *     lastRequestedAt: string|null,
 * }
 */
final readonly class ResumeDeliverySnapshot
{
    /**
     * How many requests the page lists before it stops.
     *
     * The totals above the table are counted separately and always report the
     * whole window, so a truncated list never makes the numbers lie. There is no
     * paginator anywhere in this application and this is not the place to invent
     * one: fifty is already more résumé requests than a month tends to bring.
     */
    public const int RECENT_LIMIT = 50;

    /**
     * The deliveries page: the counts, then the requests behind them.
     *
     * The totals ignore $status deliberately. Narrowing the tiles along with the
     * table would leave the reader looking at "4 failed" with no idea whether
     * that is four out of five or four out of four hundred.
     *
     * @return DeliverySummary
     */
    public function summary(AnalyticsRange $range, ?DeliveryStatus $status = null): array
    {
        $query = ResumeDelivery::query()->requestedWithin($range);

        $status?->scope($query);

        $deliveries = $query
            // One query for the events rather than one per row, ordered here so
            // the timeline reads forwards while the table reads newest first.
            ->with(['events' => fn (Relation $events) => $events->oldest('occurred_at')])
            ->newestFirst()
            ->limit(self::RECENT_LIMIT)
            ->get();

        return [
            'label' => $range->label(),
            'limit' => self::RECENT_LIMIT,
            'totals' => $this->totals($range),
            'deliveries' => array_values(
                $deliveries
                    ->map(fn (ResumeDelivery $delivery): array => $this->toRow($delivery))
                    ->all(),
            ),
        ];
    }

    /**
     * The overview's cheaper half: the counts and nothing else.
     *
     * @return DeliveryOverview
     */
    public function overview(AnalyticsRange $range): array
    {
        // Not narrowed by the range: "no requests in the last 7 days" is worth
        // saying alongside when the last one actually was.
        $lastRequestedAt = ResumeDelivery::query()->newestFirst()->first()?->created_at;

        return [
            'totals' => $this->totals($range),
            'lastRequestedAt' => $lastRequestedAt?->toIso8601String(),
        ];
    }

    /**
     * One aggregate per status, plus the total that is not a status.
     *
     * @return DeliveryTotals
     */
    private function totals(AnalyticsRange $range): array
    {
        $counted = static fn (DeliveryStatus $status): int => ResumeDelivery::query()
            ->requestedWithin($range)
            ->tap(static fn (Builder $query) => $status->scope($query))
            ->count();

        return [
            'requested' => ResumeDelivery::query()->requestedWithin($range)->count(),
            'sent' => $counted(DeliveryStatus::Sent),
            'delivered' => $counted(DeliveryStatus::Delivered),
            'failed' => $counted(DeliveryStatus::Failed),
            'blocked' => $counted(DeliveryStatus::Blocked),
            'pending' => $counted(DeliveryStatus::Pending),
        ];
    }

    /**
     * @return DeliveryRow
     */
    private function toRow(ResumeDelivery $delivery): array
    {
        $status = $delivery->status();

        return [
            'uuid' => $delivery->uuid,
            'email' => $delivery->email,
            'status' => $status->value,
            'statusLabel' => $status->label(),
            'turnstile' => $this->turnstile($delivery),
            'requestedAt' => $delivery->created_at?->toIso8601String() ?? '',
            'sentAt' => $delivery->email_sent_at?->toIso8601String(),
            'deliveredAt' => $delivery->email_delivered_at?->toIso8601String(),
            'failureReason' => $delivery->failure_reason,
            'messageId' => $delivery->message_id,
            // Every event the provider reported, not just the two the webhook
            // acts on. `opened`, `clicked` and `complained` are stored and this
            // timeline is the only place they are ever visible.
            'events' => array_values(
                $delivery->events
                    ->map(fn (EmailEvent $event): array => [
                        'event' => $event->event,
                        'occurredAt' => $event->occurred_at->toIso8601String(),
                        'severity' => $event->severity,
                        'reason' => $event->reason,
                    ])
                    ->all(),
            ),
        ];
    }

    /**
     * Three answers, not two: null means the challenge was never run, which is
     * what an unconfigured secret does, and is a different fact from a refusal.
     */
    private function turnstile(ResumeDelivery $delivery): string
    {
        return match ($delivery->turnstile_success) {
            true => 'passed',
            false => 'blocked',
            null => 'skipped',
        };
    }
}
