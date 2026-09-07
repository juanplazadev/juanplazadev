<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\EmailEvent;
use App\Models\ResumeDelivery;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<EmailEvent>
 */
final class EmailEventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_delivery_id' => ResumeDelivery::factory()->sent(),
            'provider' => 'mailgun',
            'event_id' => Str::random(32),
            'event' => 'delivered',
            'recipient' => fake()->safeEmail(),
            'message_id' => Str::uuid()->toString().'@juanplaza.dev',
            'severity' => null,
            'reason' => null,
            'payload' => [],
            'occurred_at' => now(),
        ];
    }

    public function delivered(): static
    {
        return $this->state(['event' => 'delivered']);
    }

    /** A bounce the provider will not retry. */
    public function permanentFailure(): static
    {
        return $this->state([
            'event' => 'failed',
            'severity' => 'permanent',
            'reason' => 'suppress-bounce',
        ]);
    }
}
