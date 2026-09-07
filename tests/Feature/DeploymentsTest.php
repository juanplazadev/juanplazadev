<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Sentry\CachedErrorInsights;
use Illuminate\Support\Facades\Http;

beforeEach(fn () => configureSentry());

// Mapper -------------------------------------------------------------------

test('it lists recent deployments newest first', function (): void {
    fakeSentry();

    $releases = insights()->deployments()['releases'];

    // Sentry's own order, passed through rather than re-sorted: dateCreated
    // and lastDeploy disagree the moment a commit is redeployed.
    expect($releases)->toHaveCount(2)
        ->and($releases[0]['shortVersion'])->toBe('1a2b3c4')
        ->and($releases[1]['shortVersion'])->toBe('9f8e7d6')
        ->and($releases[0]['newGroups'])->toBe(3)
        ->and($releases[0]['deployedAt'])->toBe('2026-09-02T10:30:00Z');

    // One request for the whole history. Asking per release would turn this
    // into N calls against an API that rate-limits on caller identity.
    expect(sentryCalls('/releases/'))->toBe(1);
});

test('a deploy carries its environment through', function (): void {
    fakeSentry();

    expect(insights()->deployments()['releases'][0]['environment'])
        ->toBe('production');
});

test('a release Sentry inferred from an event reports no environment', function (): void {
    $release = sentryReleasesBody()[0];
    unset($release['lastDeploy']);

    fakeSentry(releases: [$release]);

    // A version with no deploy behind it is a release Sentry auto-created when
    // an event arrived tagged with it, not something the pipeline shipped.
    expect(insights()->deployments()['releases'][0]['environment'])->toBeNull();
});

test('a release that was never deployed falls back to when it was created', function (): void {
    $release = sentryReleasesBody()[0];
    unset($release['lastDeploy']);

    fakeSentry(releases: [$release]);

    expect(insights()->deployments()['releases'][0]['deployedAt'])
        ->toBe('2026-09-01T09:00:00Z');
});

test('a release with no version is skipped rather than listed blank', function (): void {
    $releases = sentryReleasesBody();
    unset($releases[0]['version']);

    fakeSentry(releases: $releases);

    $mapped = insights()->deployments()['releases'];

    // A blank version cannot be matched against the running build, which is
    // the first thing the page answers.
    expect($mapped)->toHaveCount(1)
        ->and($mapped[0]['shortVersion'])->toBe('9f8e7d6');
});

test('it links each release to its page in sentry', function (): void {
    fakeSentry();

    $release = insights()->deployments()['releases'][0];

    // Constructed, not returned: unlike an issue, a release carries no link to
    // itself. The host comes off the API URL so the region travels with the
    // credential rather than being guessed a second time.
    expect($release['permalink'])
        ->toBe('https://us.sentry.io/organizations/test-org/releases/1a2b3c4d5e6f7a8b9c0d/?project=test-project');
});

test('a release carries no link when the api url has no host to build one from', function (): void {
    // A scheme-less SENTRY_API_URL is a live env typo rather than a hypothetical,
    // and it leaves the client configured - only the link cannot be built.
    config(['services.sentry.api_url' => 'us.sentry.io/api/0']);
    fakeSentry();

    // A half-built URL would send a reader somewhere worse than nowhere, so the
    // row drops its link instead.
    expect(insights()->deployments()['releases'][0]['permalink'])->toBeNull();
});

test('it asks for more releases than a card would have shown', function (): void {
    fakeSentry();

    insights()->deployments();

    $request = Http::recorded(
        static fn ($request): bool => str_contains($request->url(), '/releases/'),
    )->first()[0];

    // per_page costs the same whichever number it carries, and this is a page
    // now rather than a card in a column.
    expect($request->url())->toContain('per_page=20');
});

test('the releases request filters by project slug', function (): void {
    fakeSentry();

    insights()->deployments();

    $request = Http::recorded(
        static fn ($request): bool => str_contains($request->url(), '/releases/'),
    )->first()[0];

    // Unlike stats_v2, which needs numeric project ids, this one takes a slug.
    expect($request->url())->toContain('project=test-project');
});

// Empty is not the same as broken -------------------------------------------

test('an untagged project reports an empty list and no error', function (): void {
    fakeSentry(releases: []);

    $deployments = insights()->deployments();

    expect($deployments['releases'])->toBe([])
        ->and($deployments['error'])->toBeNull();
});

test('a sentry failure is reported as an error rather than an empty list', function (): void {
    fakeSentry(releases: Http::response(['detail' => 'Too Many Requests'], 429));

    $deployments = insights()->deployments();

    // The distinction this page lives or dies on. As an optional half of the
    // errors summary a failure returned [], which was right there - losing the
    // deploy card must not cost the issue list. Here that same [] would render
    // "no tagged releases yet" while Sentry was simply unreachable.
    expect($deployments['error'])->toBe('Could not reach Sentry.')
        ->and($deployments['releases'])->toBe([]);
});

test('an unconfigured account says so instead of reaching out', function (): void {
    config(['services.sentry.api_token' => null]);
    fakeSentry();

    $deployments = insights()->deployments();

    expect($deployments['error'])->toBe('Sentry is not configured.')
        ->and(sentryCalls())->toBe(0);
});

// Caching -------------------------------------------------------------------

test('the deployments cache key carries no range', function (): void {
    fakeSentry();

    resolve(CachedErrorInsights::class)->deployments();

    // Releases have no statsPeriod, so keying them by a window the answer
    // ignores would cache the same list twice over.
    expect(cache()->has('deployments:sentry'))->toBeTrue();
});

test('a second read of the deployments is served from the cache', function (): void {
    fakeSentry();

    resolve(CachedErrorInsights::class)->deployments();
    resolve(CachedErrorInsights::class)->deployments();

    expect(sentryCalls('/releases/'))->toBe(1);
});

test('a failed lookup is not cached for fifteen minutes', function (): void {
    fakeSentry(releases: Http::response(['detail' => 'Not found'], 404));

    resolve(CachedErrorInsights::class)->deployments();

    // A fixed token must not leave a quarter hour of still-broken page behind.
    expect(cache()->has('deployments:sentry'))->toBeFalse();
});

// The page ------------------------------------------------------------------

test('the deployments page defers its releases', function (): void {
    fakeSentry();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.deployments'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/deployments')
            ->has('running')
            ->missing('deployments'),
        );

    assertSentryNotCalled();
});

test('a partial reload resolves the deployments prop', function (): void {
    fakeSentry();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.deployments'), [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => sentryInertiaVersion(),
        'X-Inertia-Partial-Component' => 'admin/deployments',
        'X-Inertia-Partial-Data' => 'deployments',
    ])
        ->assertOk()
        ->assertJsonPath('props.deployments.error', null)
        ->assertJsonCount(2, 'props.deployments.releases')
        ->assertJsonPath('props.deployments.releases.0.shortVersion', '1a2b3c4');
});

test('the page reports the release the container is running', function (): void {
    config(['sentry.release' => 'abc1234']);
    fakeSentry();
    $this->actingAs(User::factory()->create());

    // Eager rather than inside the deferred summary: the cache holds for
    // fifteen minutes and a deploy does not clear it, so a cached `running`
    // would report drift already fixed a quarter of an hour ago.
    $this->get(route('admin.deployments'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('running', 'abc1234'));
});

test('a container built without a release reports none rather than a blank one', function (): void {
    config(['sentry.release' => null]);
    fakeSentry();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.deployments'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('running', null));
});

test('the page ignores a range even when one is asked for', function (): void {
    fakeSentry();
    $this->actingAs(User::factory()->create());

    // No picker, no prop, no second cache entry. The list Sentry returns is the
    // same whichever window the rest of the panel happens to be showing.
    $this->get(route('admin.deployments', ['range' => '30d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/deployments')
            ->missing('range')
            ->missing('ranges'),
        );
});

test('the page requires an authenticated user', function (): void {
    $this->get(route('admin.deployments'))->assertRedirect(route('login'));
});
