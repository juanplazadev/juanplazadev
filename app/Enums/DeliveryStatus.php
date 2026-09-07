<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\ResumeDelivery;
use Illuminate\Database\Eloquent\Builder;

/**
 * Where a résumé request got to.
 *
 * Derived, never stored. Every input is already a column on `resume_deliveries`,
 * and a denormalised copy would have to be kept in step by markSent(),
 * markDelivered(), markFailed() and the webhook - four places that would only
 * have to disagree once for the badge and the filter to start lying.
 *
 * The cases are checked in declaration order and the order is load-bearing: a
 * delivered row is also a sent row, and a row that bounced permanently was sent
 * before it failed. First match wins.
 *
 * Blocked reads `turnstile_success` for FALSE specifically, never for falsy.
 * Null there means "never asked" - the challenge is switched off end to end when
 * no secret is configured (see .ai/rules/analytics.md) - which is a different
 * fact from Cloudflare having refused, and must never render as Blocked.
 */
enum DeliveryStatus: string
{
    /** Turnstile refused. Nothing was sent, and nothing will be. */
    case Blocked = 'blocked';

    /** The provider gave up, or the send threw on its way out. */
    case Failed = 'failed';

    /** A webhook confirmed it landed. Only a webhook can say this. */
    case Delivered = 'delivered';

    /** The provider accepted it. Nothing more than that. */
    case Sent = 'sent';

    /** Queued and not yet handed over - or the queue worker is down. */
    case Pending = 'pending';

    /**
     * The status of a single row, in the declaration order above.
     */
    public static function of(ResumeDelivery $delivery): self
    {
        return match (true) {
            $delivery->turnstile_success === false => self::Blocked,
            $delivery->failure_reason !== null => self::Failed,
            $delivery->email_delivered => self::Delivered,
            $delivery->email_sent_at !== null => self::Sent,
            default => self::Pending,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Blocked => 'Blocked',
            self::Failed => 'Failed',
            self::Delivered => 'Delivered',
            self::Sent => 'Sent',
            self::Pending => 'Pending',
        };
    }

    /**
     * The SQL form of the same rules, so the filter and the badge cannot drift.
     *
     * Each case excludes the ones declared above it, which is what makes the
     * five mutually exclusive rather than merely ordered. Blocked and Failed are
     * disjoint in practice without the extra clause - a blocked request is never
     * dispatched, so it never acquires a failure_reason - but stating it here
     * keeps the SQL true on its own terms rather than on that assumption.
     *
     * @param  Builder<ResumeDelivery>  $query
     */
    public function scope(Builder $query): void
    {
        match ($this) {
            self::Blocked => $query->where('turnstile_success', false),

            self::Failed => $this->notBlocked($query)->whereNotNull('failure_reason'),

            self::Delivered => $this->unrefused($query)->where('email_delivered', true),

            self::Sent => $this->unrefused($query)
                ->where('email_delivered', false)
                ->whereNotNull('email_sent_at'),

            self::Pending => $this->unrefused($query)
                ->where('email_delivered', false)
                ->whereNull('email_sent_at'),
        };
    }

    /**
     * Neither blocked by Cloudflare nor failed at the provider.
     *
     * @param  Builder<ResumeDelivery>  $query
     * @return Builder<ResumeDelivery>
     */
    private function unrefused(Builder $query): Builder
    {
        return $this->notBlocked($query)->whereNull('failure_reason');
    }

    /**
     * Everything Turnstile did not refuse.
     *
     * Spelled out as "true or null" rather than as a negation, because SQL's
     * `NOT (turnstile_success = false)` is NULL for a NULL row and would quietly
     * drop every request made while the challenge was switched off.
     *
     * @param  Builder<ResumeDelivery>  $query
     * @return Builder<ResumeDelivery>
     */
    private function notBlocked(Builder $query): Builder
    {
        return $query->where(
            fn (Builder $allowed): Builder => $allowed
                ->where('turnstile_success', true)
                ->orWhereNull('turnstile_success'),
        );
    }
}
