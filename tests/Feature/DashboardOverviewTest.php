<?php

declare(strict_types=1);

use App\Enums\AnalyticsRange;
use App\Models\Post;
use App\Models\ResumeDelivery;
use App\Models\User;
use App\Services\Cloudflare\CachedSiteAnalytics;
use App\Services\Sentry\CachedErrorInsights;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;

beforeEach(function (): void {
    configureCloudflare();
    configureSentry();
});

/**
 * Both vendors at once.
 *
 * The overview is the only page that talks to Cloudflare and Sentry in the same
 * request, so its fixture has to answer for both. Routing is by hostname; each
 * helper's own matcher takes it from there.
 */
function fakeBothVendors(): void
{
    Http::fake([
        'api.cloudflare.com/*' => fn ($request) => Http::response(
            str_contains((string) ($request['query'] ?? ''), 'httpRequests1dGroups')
                ? zoneBody()
                : cloudflareBody(),
        ),
        'us.sentry.io/*' => fn ($request) => Http::response(match (true) {
            str_contains($request->url(), '/issues/') => sentryIssuesBody(),
            str_contains($request->url(), '/stats_v2/') => sentryStatsBody(),
            default => sentryReleasesBody(),
        }),
    ]);
}

/** A partial reload for one deferred group, as the client would send it. */
function loadGroup(string $prop): TestResponse
{
    return test()->get(route('admin.dashboard'), [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => sentryInertiaVersion(),
        'X-Inertia-Partial-Component' => 'dashboard',
        'X-Inertia-Partial-Data' => $prop,
    ]);
}

// The first response ---------------------------------------------------------

test('the overview resolves its content inline and defers both vendors', function (): void {
    fakeBothVendors();
    Post::factory()->count(2)->create();
    Post::factory()->draft()->create();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            // Two table scans, so there is nothing to gain by deferring them
            // and a populated first paint to lose.
            ->where('content.posts.total', 3)
            ->where('content.posts.published', 2)
            ->where('content.posts.drafts', 1)
            ->has('running')
            ->missing('traffic')
            ->missing('health')
            ->missing('deploys'),
        );

    // Deferred means deferred. Asserted per vendor rather than with
    // assertNothingSent(): Inertia's SSR gateway shares this recorder.
    assertCloudflareNotCalled();
    assertSentryNotCalled();
});

test('the overview carries no range picker', function (): void {
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    // Pinned to the default so its cache keys line up with the section pages.
    // A picker here would fork those keys and double the vendor traffic.
    $this->get(route('admin.dashboard', ['range' => '30d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->missing('range')->missing('ranges'));
});

test('the overview requires an authenticated user', function (): void {
    $this->get(route('admin.dashboard'))->assertRedirect(route('login'));
});

// The three groups -----------------------------------------------------------

test('each deferred group is announced under its own name', function (): void {
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    $deferred = $this->get(route('admin.dashboard'))
        ->assertOk()
        ->viewData('page')['deferredProps'];

    // Three groups rather than one list. That is what makes the client issue
    // three parallel requests, so a throttled Sentry cannot delay the traffic
    // card it has nothing to do with.
    expect($deferred)->toBe([
        'traffic' => ['traffic'],
        'health' => ['health'],
        'deploys' => ['deploys'],
    ]);
});

test('the traffic group resolves on its own', function (): void {
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    loadGroup('traffic')
        ->assertOk()
        ->assertJsonPath('props.traffic.totals.visits', 13)
        ->assertJsonPath('props.traffic.error', null);

    // Its own request, and only its own: Sentry is not touched by it.
    expect(sentryCalls())->toBe(0);
});

test('the health group resolves on its own', function (): void {
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    loadGroup('health')
        ->assertOk()
        ->assertJsonPath('props.health.totals.issues', 2)
        ->assertJsonPath('props.health.error', null);

    assertCloudflareNotCalled();
});

test('the deploys group resolves on its own', function (): void {
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    loadGroup('deploys')
        ->assertOk()
        ->assertJsonPath('props.deploys.error', null)
        ->assertJsonCount(2, 'props.deploys.releases');

    assertCloudflareNotCalled();
});

// Degrading ------------------------------------------------------------------

test('a sentry outage costs the error card and not the traffic card', function (): void {
    Http::fake([
        'api.cloudflare.com/*' => fn ($request) => Http::response(
            str_contains((string) ($request['query'] ?? ''), 'httpRequests1dGroups')
                ? zoneBody()
                : cloudflareBody(),
        ),
        'us.sentry.io/*' => Http::response(['detail' => 'Too Many Requests'], 429),
    ]);
    $this->actingAs(User::factory()->create());

    loadGroup('traffic')
        ->assertOk()
        ->assertJsonPath('props.traffic.totals.visits', 13);

    loadGroup('health')
        ->assertOk()
        ->assertJsonPath('props.health.error', 'Could not reach Sentry.');
});

test('an unconfigured cloudflare still renders the overview', function (): void {
    config(['services.cloudflare.api_token' => null]);
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.dashboard'))->assertOk();

    loadGroup('traffic')
        ->assertOk()
        ->assertJsonPath('props.traffic.error', 'Cloudflare analytics is not configured.');
});

test('the overview reports the running build without consulting sentry', function (): void {
    config(['sentry.release' => 'abc1234']);
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    // config, not a cached answer: the caches hold for fifteen minutes and a
    // deploy does not clear them, so a cached copy would report stale drift.
    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('running', 'abc1234'));

    assertSentryNotCalled();
});

// Sharing the section pages' caches -------------------------------------------

test('the overview warms the caches the section pages read', function (): void {
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    loadGroup('traffic');
    loadGroup('health');
    loadGroup('deploys');

    // The whole reason the overview pins AnalyticsRange::default(): these are
    // the exact keys /dashboard/analytics and /dashboard/errors land on when
    // you arrive at them with no ?range=.
    expect(cache()->has('analytics:cloudflare:7d'))->toBeTrue()
        ->and(cache()->has('insights:sentry:7d'))->toBeTrue()
        ->and(cache()->has('deployments:sentry'))->toBeTrue();
});

test('a section page after the overview spends no further vendor requests', function (): void {
    fakeBothVendors();
    $this->actingAs(User::factory()->create());

    loadGroup('traffic');
    $afterOverview = cloudflareCalls();

    resolve(CachedSiteAnalytics::class)->summary(AnalyticsRange::default());
    resolve(CachedErrorInsights::class)->deployments();

    // The deployments read is a cache miss the overview already paid for; the
    // analytics read is the traffic page arriving at its default range.
    expect(cloudflareCalls())->toBe($afterOverview);
});

// What the cards are built from ------------------------------------------------

test('the overview resolves the delivery counts inline alongside the content', function (): void {
    fakeBothVendors();

    ResumeDelivery::factory()->count(2)->delivered()->create();
    ResumeDelivery::factory()->blocked()->create();

    $this->actingAs(User::factory()->create());

    // Local aggregates, so they are not a fourth deferred group: a group costs
    // a parallel HTTP request, which is the wrong trade for six counts against
    // one table. The strip tile, the card and the attention list all read them.
    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('deliveries.totals.requested', 3)
            ->where('deliveries.totals.delivered', 2)
            ->where('deliveries.totals.blocked', 1)
            ->has('deliveries.lastRequestedAt')
            // The overview gets the counts and nothing else - the table of
            // requests belongs to /dashboard/deliveries.
            ->missing('deliveries.deliveries'),
        );
});

test('the content prop carries the drafts the attention list names', function (): void {
    fakeBothVendors();

    $stale = Post::factory()->draft()->create(['title' => 'Zero Trust']);
    $stale->forceFill(['updated_at' => CarbonImmutable::now()->subDays(30)])->saveQuietly();

    $this->actingAs(User::factory()->create());

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('content.staleDrafts', 1)
            ->where('content.staleDrafts.0.title', 'Zero Trust')
            ->where('content.staleDrafts.0.slug', $stale->slug),
        );
});
