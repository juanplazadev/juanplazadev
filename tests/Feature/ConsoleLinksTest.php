<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;

/*
 * admin.deliveries rather than the overview: it is the one panel page that
 * resolves everything from local tables, so these tests can assert on a shared
 * prop without standing up Cloudflare and Sentry fixtures that have nothing to
 * do with what is being proved.
 */
function visitPanel(): TestResponse
{
    return test()->actingAs(User::factory()->create())->get(route('admin.deliveries'));
}

/** @param  array<string, mixed>  $overrides */
function configureConsoles(array $overrides = []): void
{
    config([
        'services.sentry.api_url' => 'https://us.sentry.io/api/0',
        'services.sentry.organization' => 'test-org',
        'services.sentry.project' => 'test-project',
        'services.cloudflare.account_id' => 'acct-tag',
        'services.mailgun.domain' => 'mg.example.com',
        'services.mailpit.url' => 'http://localhost:8025',
        ...$overrides,
    ]);
}

test('a configured environment shares every console', function (): void {
    configureConsoles();

    visitPanel()
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('consoles.0.id', 'sentry')
            ->where('consoles.0.url', 'https://us.sentry.io/organizations/test-org/issues/?project=test-project')
            ->where('consoles.1.url', 'https://dash.cloudflare.com/acct-tag/web-analytics')
            ->where('consoles.2.url', 'https://app.mailgun.com/mg/sending/mg.example.com')
            ->where('consoles.3.url', 'http://localhost:8025')
            ->has('consoles', 4)
            ->etc());
});

/*
 * The gate the whole design rests on. MAILPIT_URL is only ever set locally, so
 * an unset credential dropping its case is what keeps a link to a container
 * that is not there out of the production sidebar - there is no environment
 * check anywhere to catch it if this stops holding.
 */
test('an unconfigured service is dropped rather than linked', function (): void {
    configureConsoles(['services.mailpit.url' => null, 'services.mailgun.domain' => null]);

    visitPanel()
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('consoles', fn (Collection $consoles): bool => $consoles
                ->pluck('id')
                ->all() === ['sentry', 'cloudflare'])
            ->etc());
});

test('a sentry url is dropped when the api url carries no host to borrow', function (): void {
    configureConsoles(['services.sentry.api_url' => 'not-a-url']);

    visitPanel()
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('consoles', fn (Collection $consoles): bool => $consoles
                ->pluck('id')
                ->doesntContain('sentry'))
            ->etc());
});

/*
 * The entries carry the Sentry org slug, the Cloudflare account id and the
 * Mailgun domain. None of that belongs in a page a stranger can request.
 */
test('a guest is shared no consoles at all', function (): void {
    configureConsoles();

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('consoles', [])
            ->etc());
});
