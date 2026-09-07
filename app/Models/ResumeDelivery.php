<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AnalyticsRange;
use App\Enums\DeliveryStatus;
use Carbon\CarbonImmutable;
use Database\Factories\ResumeDeliveryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Somebody asked for the résumé by email.
 *
 * The row is written before anything is sent, and before the challenge is even
 * judged, so it is the record of the *request* as much as of the delivery: a
 * blocked bot leaves a row with `turnstile_success` false and no message id.
 *
 * @property int $id
 * @property string $uuid
 * @property string $email
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property bool|null $turnstile_success
 * @property list<string>|null $turnstile_errors
 * @property string|null $message_id
 * @property CarbonImmutable|null $email_sent_at
 * @property bool $email_delivered
 * @property CarbonImmutable|null $email_delivered_at
 * @property string|null $failure_reason
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[RouteKey('uuid')]
#[Fillable([
    'uuid', 'email', 'ip_address', 'user_agent',
    'turnstile_success', 'turnstile_errors', 'message_id',
    'email_sent_at', 'email_delivered', 'email_delivered_at', 'failure_reason',
])]
final class ResumeDelivery extends Model
{
    /** @use HasFactory<ResumeDeliveryFactory> */
    use HasFactory;

    /**
     * Providers quote a Message-Id inconsistently - Mailgun's API hands one
     * back bare and its webhooks send the same value wrapped in angle brackets.
     * Every read and write of the column goes through here, because the moment
     * the two sides disagree the join stops matching and nothing errors.
     */
    public static function normalizeMessageId(?string $messageId): ?string
    {
        $messageId = mb_trim((string) $messageId, " \t\n\r\0\x0B<>");

        return $messageId === '' ? null : $messageId;
    }

    /**
     * @return HasMany<EmailEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(EmailEvent::class);
    }

    /**
     * Record that the message left the application.
     *
     * Sent is not delivered: the provider has accepted it, nothing more. Only a
     * webhook can say it arrived, which is what markDelivered() is for.
     */
    public function markSent(?string $messageId): void
    {
        $this->forceFill([
            'message_id' => self::normalizeMessageId($messageId),
            'email_sent_at' => now(),
            'failure_reason' => null,
        ])->save();
    }

    public function markDelivered(?CarbonImmutable $at = null): void
    {
        $this->forceFill([
            'email_delivered' => true,
            'email_delivered_at' => $at ?? now(),
        ])->save();
    }

    /**
     * Where this request got to, derived rather than stored.
     *
     * The rules and their order live on the enum, so the badge, the tiles and
     * the status filter all read the same five definitions.
     */
    public function status(): DeliveryStatus
    {
        return DeliveryStatus::of($this);
    }

    public function markFailed(string $reason): void
    {
        // Truncated rather than rejected: a provider's failure sentence is
        // free text and a long one must not cost us the record that it failed.
        $this->forceFill(['failure_reason' => Str::limit($reason, 250)])->save();
    }

    protected static function booted(): void
    {
        // Filled here rather than in the action so that factories, seeders and
        // any future console command all get one without remembering to.
        self::creating(function (self $delivery): void {
            $delivery->uuid ??= (string) Str::uuid7();
        });
    }

    /**
     * Newest first.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function newestFirst(Builder $query): void
    {
        $query->latest('created_at')->orderByDesc('id');
    }

    /**
     * Requests made inside the window the panel is showing.
     *
     * The lower bound only. AnalyticsRange::endsAt() is now, and a row cannot be
     * created later than that, so an upper bound would be an index lookup that
     * can never exclude anything.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function requestedWithin(Builder $query, AnalyticsRange $range): void
    {
        $query->where('created_at', '>=', $range->startsAt());
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'turnstile_success' => 'boolean',
            'turnstile_errors' => 'array',
            'email_delivered' => 'boolean',
            'email_sent_at' => 'immutable_datetime',
            'email_delivered_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
