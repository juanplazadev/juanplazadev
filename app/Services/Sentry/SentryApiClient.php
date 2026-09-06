<?php

declare(strict_types=1);

namespace App\Services\Sentry;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * The only thing in the application that knows Sentry's Web API exists.
 *
 * Sentry is REST, so unlike Cloudflare's GraphQL endpoint it reports failure in
 * the status code and there is no honest-looking 200 to defend against. It has
 * a different trap instead, and it is in the query string: several of its
 * parameters are repeated keys - `field=…&groupBy=outcome&groupBy=category` -
 * and PHP's own encoder writes a list as `groupBy[0]=…&groupBy[1]=…`, which
 * Sentry ignores. An ignored `groupBy` does not error; it answers with one
 * ungrouped total, which reads as "the account has no rate-limited events"
 * rather than as a malformed request. queryString() below is the fix.
 *
 * The token is a *user* auth token, not an organization one: the organization
 * variety is scoped for CI (org:ci, release creation) and cannot read issues.
 */
final readonly class SentryApiClient
{
    public function __construct(private ?string $token, private ?string $baseUrl) {}

    public function isConfigured(): bool
    {
        return $this->token !== null && $this->token !== ''
            && $this->baseUrl !== null && $this->baseUrl !== '';
    }

    /**
     * Execute a GET and return its decoded body.
     *
     * @param  array<string, scalar|list<scalar>>  $query
     * @return array<mixed>
     *
     * @throws SentryApiException|ConnectionException
     */
    public function get(string $path, array $query = []): array
    {
        $response = Http::withToken((string) $this->token)
            ->acceptJson()
            ->timeout(10)
            ->retry(2, 200, throw: false)
            ->get($this->url($path, $query));

        if ($response->failed()) {
            throw SentryApiException::fromResponse($response);
        }

        $body = $response->json();

        return is_array($body) ? $body : [];
    }

    /**
     * @param  array<string, scalar|list<scalar>>  $query
     */
    private function url(string $path, array $query): string
    {
        $url = mb_rtrim((string) $this->baseUrl, '/').'/'.mb_ltrim($path, '/');
        $queryString = $this->queryString($query);

        return $queryString === '' ? $url : $url.'?'.$queryString;
    }

    /**
     * Encode a query with repeated keys rather than indexed ones.
     *
     * http_build_query() is still doing the escaping - only the `[0]` it inserts
     * for list members is stripped afterwards, which is what turns
     * `groupBy%5B0%5D=outcome` back into the `groupBy=outcome` Sentry reads.
     *
     * @param  array<string, scalar|list<scalar>>  $query
     */
    private function queryString(array $query): string
    {
        $encoded = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        return (string) preg_replace('/%5B\d+%5D=/', '=', $encoded);
    }
}
