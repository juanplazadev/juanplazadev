<?php

declare(strict_types=1);

namespace App\Services\Sentry;

/**
 * Links into the Sentry *web UI*, as opposed to the API the rest of this
 * namespace talks to.
 *
 * The host comes off the API URL with its path stripped - so
 * `https://us.sentry.io/api/0` gives `https://us.sentry.io` - because the
 * region is already encoded in the credential and guessing it a second time is
 * how you send a reader to another region's empty account. The legacy
 * `/organizations/{slug}/` path form is deliberate: it redirects correctly
 * whichever URL scheme the organization is on, while the org-subdomain form
 * would have to be assembled from a slug that may not be the subdomain.
 *
 * Every method returns null rather than a half-built URL, so a caller with an
 * unusable API URL renders no link instead of a broken one.
 */
final readonly class SentryWebUrl
{
    public function __construct(
        private ?string $apiUrl,
        private ?string $organization,
        private ?string $project,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            config('services.sentry.api_url'),
            config('services.sentry.organization'),
            config('services.sentry.project'),
        );
    }

    /**
     * The issue stream, which is what the Sentry console opens on.
     */
    public function issues(): ?string
    {
        return $this->scoped($this->path('issues/'));
    }

    /**
     * The page for one release.
     *
     * Constructed rather than read, unlike an issue's permalink: the release
     * endpoint hands back no link to itself. Its `url` field belongs to the
     * repository the release was cut from and is usually null.
     */
    public function release(string $version): ?string
    {
        return $this->scoped($this->path('releases/'.rawurlencode($version).'/'));
    }

    /**
     * The organization's web root, or null when the API URL carries no scheme
     * and host to borrow or no organization to address.
     */
    private function path(string $suffix): ?string
    {
        $host = parse_url((string) $this->apiUrl, PHP_URL_HOST);
        $scheme = parse_url((string) $this->apiUrl, PHP_URL_SCHEME);

        if (! is_string($host) || $host === '' || ! is_string($scheme) || $scheme === '') {
            return null;
        }

        if ($this->organization === null || $this->organization === '') {
            return null;
        }

        return "{$scheme}://{$host}/organizations/{$this->organization}/{$suffix}";
    }

    /**
     * Narrow a URL to the configured project. Optional on purpose: without a
     * project slug Sentry answers for every project the token can see, which
     * for a single-project account is the same answer.
     */
    private function scoped(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }

        return $this->project === null || $this->project === ''
            ? $url
            : $url.'?project='.rawurlencode($this->project);
    }
}
