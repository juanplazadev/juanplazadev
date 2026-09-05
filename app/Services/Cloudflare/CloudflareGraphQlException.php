<?php

declare(strict_types=1);

namespace App\Services\Cloudflare;

use RuntimeException;

/**
 * Raised when Cloudflare answers with an `errors` array, or with no `data` at all.
 *
 * Separate from a transport failure on purpose: an HTTP error means the request
 * never landed, while this means it landed and was refused. The two want
 * different fixes - a retry for the first, a token or filter change for the
 * second - and only this one is worth surfacing verbatim in the log.
 */
final class CloudflareGraphQlException extends RuntimeException
{
    /**
     * @param  list<array<string, mixed>>  $errors
     */
    public static function fromErrors(array $errors): self
    {
        $messages = array_map(
            static fn (array $error): string => (string) ($error['message'] ?? 'unknown error'),
            $errors,
        );

        return new self('Cloudflare GraphQL: '.implode('; ', $messages));
    }
}
