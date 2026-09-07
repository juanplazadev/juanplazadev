<?php

declare(strict_types=1);

namespace App\Enums;

use App\Services\Sentry\SentryWebUrl;

/**
 * The third-party consoles behind the admin sidebar's "Consoles" menu.
 *
 * Each case builds its URL from the same credentials the corresponding panel
 * page already reads, so nothing here is a second place to keep an account in
 * step. A case whose service is unconfigured returns null from url() and is
 * dropped by options(): that config presence is the only gate, the same way an
 * unset Turnstile secret switches the challenge off end to end. It is also what
 * keeps Mailpit - which only exists in the local Docker stack - out of the
 * production sidebar without branching on the environment.
 */
enum Console: string
{
    case Sentry = 'sentry';
    case Cloudflare = 'cloudflare';
    case Mailgun = 'mailgun';
    case Mailpit = 'mailpit';

    /**
     * Every console this environment can actually reach, in menu order.
     *
     * @return list<array{id: string, label: string, url: string}>
     */
    public static function options(): array
    {
        $options = [];

        foreach (self::cases() as $console) {
            $url = $console->url();

            if ($url === null) {
                continue;
            }

            $options[] = [
                'id' => $console->value,
                'label' => $console->label(),
                'url' => $url,
            ];
        }

        return $options;
    }

    public function label(): string
    {
        return match ($this) {
            self::Sentry => 'Sentry',
            self::Cloudflare => 'Cloudflare',
            self::Mailgun => 'Mailgun',
            self::Mailpit => 'Mailpit',
        };
    }

    /**
     * The console's landing page, or null when the service is unconfigured.
     *
     * Each lands on the view whose data the matching panel page mirrors -
     * Sentry's issue stream behind /dashboard/errors, Cloudflare's Web
     * Analytics behind /dashboard/analytics, the Mailgun domain behind
     * /dashboard/deliveries - so the link answers "show me the source of this
     * page" rather than dropping the reader on an account home.
     */
    public function url(): ?string
    {
        return match ($this) {
            self::Sentry => SentryWebUrl::fromConfig()->issues(),
            self::Cloudflare => self::scoped(
                config('services.cloudflare.account_id'),
                static fn (string $account): string => "https://dash.cloudflare.com/{$account}/web-analytics",
            ),
            self::Mailgun => self::scoped(
                config('services.mailgun.domain'),
                static fn (string $domain): string => 'https://app.mailgun.com/mg/sending/'.rawurlencode($domain),
            ),
            self::Mailpit => self::scoped(
                config('services.mailpit.url'),
                static fn (string $url): string => $url,
            ),
        };
    }

    /**
     * Build a URL from a config value, or null when that value is missing.
     *
     * Takes mixed because config() is untyped: a key absent from the file and a
     * key present but unset both have to read as "no console here" rather than
     * assembling a URL around the word "null".
     *
     * @param  callable(string): string  $build
     */
    private static function scoped(mixed $value, callable $build): ?string
    {
        return is_string($value) && $value !== ''
            ? $build($value)
            : null;
    }
}
