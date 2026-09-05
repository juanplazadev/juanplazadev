<?php

declare(strict_types=1);

namespace App\Services\Cloudflare;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * The only thing in the application that knows Cloudflare's GraphQL endpoint exists.
 *
 * One method, one trap. Cloudflare answers a *failed* query with HTTP 200 and
 * the failure in a top-level `errors` array, so a client that checks the status
 * code reports success and hands back an empty result set. Every wrong
 * identifier, missing token permission and invalid dimension name during setup
 * looked identical for exactly this reason. throwIfErrored() is the fix, and it
 * is why callers never see the raw envelope.
 */
final readonly class CloudflareGraphQlClient
{
    private const string ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

    public function __construct(private ?string $token) {}

    public function isConfigured(): bool
    {
        return $this->token !== null && $this->token !== '';
    }

    /**
     * Execute a query and return its `data` payload.
     *
     * @param  array<string, mixed>  $variables
     * @return array<string, mixed>
     *
     * @throws CloudflareGraphQlException|ConnectionException|RequestException
     */
    public function query(string $query, array $variables = []): array
    {
        $response = Http::withToken((string) $this->token)
            ->acceptJson()
            ->timeout(10)
            ->retry(2, 200, throw: false)
            ->post(self::ENDPOINT, [
                'query' => $query,
                'variables' => $variables,
            ]);

        // A transport failure is a different animal from a refusal, so it keeps
        // Laravel's own RequestException rather than being folded into ours.
        $response->throw();

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        $this->throwIfErrored($body);

        /** @var array<string, mixed> $data */
        $data = $body['data'] ?? [];

        return $data;
    }

    /**
     * @param  array<string, mixed>  $body
     *
     * @throws CloudflareGraphQlException
     */
    private function throwIfErrored(array $body): void
    {
        $errors = $body['errors'] ?? null;

        if (is_array($errors) && $errors !== []) {
            /** @var list<array<string, mixed>> $errors */
            throw CloudflareGraphQlException::fromErrors($errors);
        }

        if (! isset($body['data']) || ! is_array($body['data'])) {
            throw new CloudflareGraphQlException('Cloudflare GraphQL: response contained no data.');
        }
    }
}
