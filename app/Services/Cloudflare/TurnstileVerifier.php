<?php

declare(strict_types=1);

namespace App\Services\Cloudflare;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The only thing in the application that knows Turnstile's siteverify exists.
 *
 * Two deliberate behaviours:
 *
 * 1. No secret means the feature is OFF, not open. verify() returns a skipped
 *    verification, HandleInertiaRequests shares no site key so the widget never
 *    renders, and the form request stops requiring a token. Local and CI run
 *    without Cloudflare credentials because of this, and it is the only reason
 *    they can.
 * 2. A transport failure FAILS the check rather than passing it. Cloudflare
 *    being unreachable is not evidence the visitor is human, and the alternative
 *    turns a Cloudflare outage into an open relay for the form.
 *
 * There is no score in the response. Turnstile answers pass/fail plus error
 * codes; a numeric score is a reCAPTCHA v3 idea, and asking for one here will
 * only ever produce null.
 */
final readonly class TurnstileVerifier
{
    private const string ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function __construct(private ?string $secretKey) {}

    public function isConfigured(): bool
    {
        return $this->secretKey !== null && $this->secretKey !== '';
    }

    public function verify(?string $token, ?string $ip = null): TurnstileVerification
    {
        if (! $this->isConfigured()) {
            return TurnstileVerification::skipped();
        }

        if ($token === null || $token === '') {
            return TurnstileVerification::failed(['missing-input-response']);
        }

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout(5)
                ->post(self::ENDPOINT, array_filter([
                    'secret' => $this->secretKey,
                    'response' => $token,
                    'remoteip' => $ip,
                ]));
        } catch (Throwable $throwable) {
            Log::warning('Turnstile siteverify was unreachable.', ['exception' => $throwable->getMessage()]);

            return TurnstileVerification::failed(['internal-error']);
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        if ($response->successful() && ($body['success'] ?? false) === true) {
            return TurnstileVerification::passed();
        }

        return TurnstileVerification::failed($this->errorCodes($body));
    }

    /**
     * @param  array<string, mixed>  $body
     * @return list<string>
     */
    private function errorCodes(array $body): array
    {
        $codes = $body['error-codes'] ?? [];

        if (! is_array($codes)) {
            return ['internal-error'];
        }

        return array_values(array_map(strval(...), $codes));
    }
}
