<?php

declare(strict_types=1);

use App\Models\User;

it('renders the profile settings page', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/settings/profile')
        ->assertNoSmoke()
        ->assertSee('Profile')
        ->assertPresent('@update-profile-button');
});

it('renders the appearance settings page', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/settings/appearance')
        ->assertNoSmoke()
        ->assertSee('Appearance settings');
});

it('redirects /settings to the profile page', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/settings')
        ->assertPathIs('/settings/profile');
});

/*
 * /settings/security carries RequirePassword, so a fresh session lands on the
 * confirmation screen first. Driving that redirect covers the security page and
 * the confirm-password page in one pass, which is the only way a browser ever
 * reaches the former.
 */
it('puts a password confirmation in front of the security page', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/settings/security')
        ->assertPathIs('/user/confirm-password')
        ->assertNoSmoke()
        ->assertSee('Confirm password')
        ->type('password', 'password')
        ->click('@confirm-password-button')
        ->assertPathIs('/settings/security')
        ->assertSee('Update password');
});
