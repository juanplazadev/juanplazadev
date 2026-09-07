<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ResumeDelivery;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ResumeDelivery>
 */
final class ResumeDeliveryFactory extends Factory
{
    /**
     * The default is the moment right after the request came in: logged, the
     * challenge passed, nothing sent yet. Every other state builds on it.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'turnstile_success' => true,
            'turnstile_errors' => null,
            'message_id' => null,
            'email_sent_at' => null,
            'email_delivered' => false,
            'email_delivered_at' => null,
            'failure_reason' => null,
        ];
    }

    /** Handed to the provider, which has not reported back yet. */
    public function sent(): static
    {
        return $this->state(fn (): array => [
            'message_id' => Str::uuid()->toString().'@juanplaza.dev',
            'email_sent_at' => now()->subMinutes(2),
        ]);
    }

    /** Sent, and a webhook confirmed it landed. */
    public function delivered(): static
    {
        return $this->sent()->state([
            'email_delivered' => true,
            'email_delivered_at' => now()->subMinute(),
        ]);
    }

    /** Turnstile refused, so nothing was ever sent. */
    public function blocked(): static
    {
        return $this->state([
            'turnstile_success' => false,
            'turnstile_errors' => ['invalid-input-response'],
        ]);
    }

    /** The challenge was never run, which is what an unconfigured secret does. */
    public function unchallenged(): static
    {
        return $this->state([
            'turnstile_success' => null,
            'turnstile_errors' => null,
        ]);
    }
}
