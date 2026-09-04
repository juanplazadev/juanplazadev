<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('security page is displayed', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertInertia(fn (Assert $page): Assert => $page
            ->component('settings/security')
            ->where('canManagePasskeys', true)
            ->where('passkeys', [])
            ->has('passwordRules'),
        );
});

test('security page lists the user passkeys', function (): void {
    $user = User::factory()->create();

    $user->passkeys()->create([
        'name' => 'MacBook Pro',
        'credential_id' => 'test-credential-id',
        'credential' => ['aaguid' => 'unknown'],
    ]);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertInertia(fn (Assert $page): Assert => $page
            ->component('settings/security')
            ->has('passkeys', 1)
            ->where('passkeys.0.name', 'MacBook Pro')
            ->whereType('passkeys.0.created_at_diff', 'string')
            ->where('passkeys.0.last_used_at_diff', null),
        );
});

test('security page requires password confirmation', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->get(route('security.edit'));

    $response->assertRedirect(route('password.confirm'));
});

test('security page renders without passkeys when the feature is disabled', function (): void {
    config(['fortify.features' => []]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page): Assert => $page
            ->component('settings/security')
            ->where('canManagePasskeys', false)
            ->where('passkeys', []),
        );
});

test('password can be updated', function (): void {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('security.edit'))
        ->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('security.edit'));

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

test('correct password must be provided to update password', function (): void {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('security.edit'))
        ->put(route('user-password.update'), [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasErrors('current_password')
        ->assertRedirect(route('security.edit'));
});
