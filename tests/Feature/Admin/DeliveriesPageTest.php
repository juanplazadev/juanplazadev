<?php

declare(strict_types=1);

use App\Mail\ResumeDeliverySnapshot;
use App\Models\ResumeDelivery;
use App\Models\User;
use Illuminate\Testing\TestResponse;

/** A partial reload for the filter buttons, as the client sends it. */
function reloadDeliveries(array $query = []): TestResponse
{
    return test()->get(route('admin.deliveries', $query), [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => inertiaVersion(),
        'X-Inertia-Partial-Component' => 'admin/deliveries',
        'X-Inertia-Partial-Data' => 'deliveries',
    ]);
}

test('the deliveries page is behind the admin middleware', function (): void {
    $this->get(route('admin.deliveries'))->assertRedirect(route('login'));
});

test('the page resolves its deliveries inline rather than deferring them', function (): void {
    ResumeDelivery::factory()->delivered()->create(['email' => 'ada@example.com']);
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.deliveries'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/deliveries')
            ->where('range', '7d')
            ->has('ranges', 2)
            ->where('status', null)
            ->has('statuses', 5)
            // Eager, unlike every sibling section page. There is no vendor here
            // to rate-limit or fail, so a deferred prop would buy a second round
            // trip and a skeleton for data already in hand.
            ->has('deliveries.deliveries', 1)
            ->where('deliveries.deliveries.0.email', 'ada@example.com')
            ->where('deliveries.totals.requested', 1),
        );
});

test('an empty window renders the page rather than an error', function (): void {
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.deliveries'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('deliveries.deliveries', 0)
            ->where('deliveries.totals.requested', 0),
        );
});

test('the status filter narrows the table without narrowing the totals', function (): void {
    ResumeDelivery::factory()->count(2)->delivered()->create();
    ResumeDelivery::factory()->blocked()->create(['email' => 'bot@example.com']);
    $this->actingAs(User::factory()->create());

    // A partial reload answers with JSON, not the root view, so assertInertia()
    // cannot read it - assert the payload directly.
    reloadDeliveries(['status' => 'blocked'])
        ->assertOk()
        ->assertJsonCount(1, 'props.deliveries.deliveries')
        ->assertJsonPath('props.deliveries.deliveries.0.email', 'bot@example.com')
        ->assertJsonPath('props.deliveries.totals.requested', 3)
        ->assertJsonPath('props.deliveries.totals.blocked', 1);
});

test('a known range and status are carried into the page props', function (): void {
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.deliveries', ['range' => '30d', 'status' => 'failed']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('range', '30d')
            ->where('status', 'failed')
            ->where('deliveries.label', 'Last 30 days'),
        );
});

test('an unrecognised range or status falls back instead of failing', function (): void {
    $this->actingAs(User::factory()->create());

    // Both are links in the page, not form fields: a stale bookmark should
    // render the default view rather than a 422.
    $this->get(route('admin.deliveries', ['range' => '90d', 'status' => 'exploded']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('range', '7d')
            ->where('status', null),
        );
});

test('a repeated query parameter is a miss rather than a crash', function (): void {
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.deliveries').'?range[]=7d&status[]=failed')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', '7d')->where('status', null));
});

test('the page tells the client how many rows it will ever list', function (): void {
    $this->actingAs(User::factory()->create());

    // The table says "showing the newest N" from this, so it must not be a
    // number the component keeps its own copy of.
    $this->get(route('admin.deliveries'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('deliveries.limit', ResumeDeliverySnapshot::RECENT_LIMIT),
        );
});
