<?php

declare(strict_types=1);

namespace App\Services\Sentry;

use Illuminate\Http\Client\Response;
use RuntimeException;

/**
 * Raised when Sentry answers with a non-2xx status.
 *
 * Separate from a transport failure for the same reason
 * CloudflareGraphQlException is: an HTTP error means the request never landed,
 * while this means it landed and was refused. Here the distinction between
 * refusals matters too, so the status travels in the message - a 401 is a bad
 * or unscoped token, a 404 is a wrong organization or project slug, and a 429
 * is the documented rate limit, which is applied per caller identity rather
 * than per token and so cannot be worked around by minting a second one.
 */
final class SentryApiException extends RuntimeException
{
    public static function fromResponse(Response $response): self
    {
        $body = $response->json();
        $detail = is_array($body) ? ($body['detail'] ?? null) : null;

        return new self(sprintf(
            'Sentry API: HTTP %d%s',
            $response->status(),
            is_string($detail) && $detail !== '' ? ' - '.$detail : '',
        ));
    }
}
