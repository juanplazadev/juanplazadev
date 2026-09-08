<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Jobs\SendResumeEmail;
use App\Models\FailedJob;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<FailedJob>
 */
final class FailedJobFactory extends Factory
{
    /**
     * A send that ran out of tries.
     *
     * The exception is a real multi-line trace rather than one line, because
     * FailedJob::reason() exists to take the first line off one and a
     * single-line fixture would never exercise that.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid7(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => QueuedJobFactory::payload(SendResumeEmail::class),
            'exception' => "Symfony\Component\Mailer\Exception\TransportException: Connection refused\n"
                ."#0 /var/www/html/vendor/symfony/mailer/Transport.php(120): send()\n"
                .'#1 {main}',
            'failed_at' => now()->subMinutes(5),
        ];
    }
}
