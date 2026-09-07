<?php

declare(strict_types=1);

namespace App\Services\Mailgun;

use Illuminate\Contracts\Cache\Repository;

/**
 * Proves a webhook really came from Mailgun.
 *
 * The route has to be public - Mailgun cannot authenticate - so this signature
 * is the only thing standing between the endpoint and anyone who can spell the
 * URL. Three separate checks, and all three matter:
 *
 * 1. The HMAC itself, compared with hash_equals so the comparison cannot be
 *    timed. The key is the WEBHOOK SIGNING key, not the sending API key.
 * 2. Freshness. A signature stays valid forever on its own, so an old capture
 *    would replay indefinitely without the age check.
 * 3. Single use. Mailgun's `token` is per-delivery, so remembering it for the
 *    length of the freshness window turns a replay inside that window into a
 *    rejection too.
 */
final readonly class MailgunSignature
{
    /** How old a signature may be. Mailgun retries fast; minutes are generous. */
    private const int TOLERANCE_SECONDS = 300;

    public function __construct(
        private ?string $signingKey,
        private Repository $cache,
    ) {}

    public function isConfigured(): bool
    {
        return $this->signingKey !== null && $this->signingKey !== '';
    }

    public function isValid(string $timestamp, string $token, string $signature): bool
    {
        // Unconfigured refuses rather than accepts. An unsigned endpoint that
        // writes rows is worse than one that answers 403.
        if (! $this->isConfigured()) {
            return false;
        }

        if (! $this->isFresh($timestamp)) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.$token, (string) $this->signingKey);

        if (! hash_equals($expected, $signature)) {
            return false;
        }

        return $this->claimToken($token);
    }

    private function isFresh(string $timestamp): bool
    {
        if (! is_numeric($timestamp)) {
            return false;
        }

        return abs(now()->getTimestamp() - (int) $timestamp) <= self::TOLERANCE_SECONDS;
    }

    /**
     * True the first time this token is seen, false every time after.
     *
     * add() is the atomic half of the cache contract, so two webhooks racing
     * with the same token cannot both win.
     */
    private function claimToken(string $token): bool
    {
        return $this->cache->add(
            'mailgun-webhook:'.hash('sha256', $token),
            true,
            self::TOLERANCE_SECONDS * 2,
        );
    }
}
