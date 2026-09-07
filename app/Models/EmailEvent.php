<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\EmailEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One thing an email provider told us happened to a message.
 *
 * @property int $id
 * @property int|null $resume_delivery_id
 * @property string $provider
 * @property string $event_id
 * @property string $event
 * @property string|null $recipient
 * @property string|null $message_id
 * @property string|null $severity
 * @property string|null $reason
 * @property array<string, mixed> $payload
 * @property CarbonImmutable $occurred_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'resume_delivery_id', 'provider', 'event_id', 'event',
    'recipient', 'message_id', 'severity', 'reason', 'payload', 'occurred_at',
])]
final class EmailEvent extends Model
{
    /** @use HasFactory<EmailEventFactory> */
    use HasFactory;

    /** A message the provider gave up on. Retrying it would be pointless. */
    public function isPermanentFailure(): bool
    {
        return $this->event === 'failed' && $this->severity === 'permanent';
    }

    /**
     * @return BelongsTo<ResumeDelivery, $this>
     */
    public function resumeDelivery(): BelongsTo
    {
        return $this->belongsTo(ResumeDelivery::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'occurred_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
