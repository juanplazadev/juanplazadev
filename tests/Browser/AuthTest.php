<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;

it('renders the login page', function (): void {
    visit('/login')
        ->assertNoSmoke()
        ->assertSee('Log in to your account')
        ->assertPresent('@login-button')
        ->assertSeeLink('Forgot your password?');
});

/*
 * Landing on /dashboard fires the deferred analytics prop, and the Cloudflare
 * credentials in .env are real - phpunit.xml does not blank them. Without this
 * fake, signing in makes a live credentialed API call.
 */
it('signs a user in through the form', function (): void {
    Http::fake(['api.cloudflare.com/*' => Http::response(['data' => null, 'errors' => null])]);

    $user = User::factory()->create();

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'password')
        ->click('@login-button')
        ->assertPathIs('/dashboard');

    $this->assertAuthenticatedAs($user);
});

it('reports invalid credentials without signing in', function (): void {
    User::factory()->create(['email' => 'juan@example.com']);

    visit('/login')
        ->type('email', 'juan@example.com')
        ->type('password', 'wrong-password')
        ->click('@login-button')
        ->assertPathIs('/login')
        ->assertSee('These credentials do not match our records.');

    $this->assertGuest();
});

it('renders the forgot password page', function (): void {
    visit('/forgot-password')
        ->assertNoSmoke()
        ->assertSee('Forgot password')
        ->assertPresent('@email-password-reset-link-button');
});

/*
 * The payoff of the plugin's in-process server: the browser drives the form and
 * PHP asserts the notification it caused, in one test.
 */
it('sends a reset link from the forgot password form', function (): void {
    Notification::fake();

    $user = User::factory()->create();

    visit('/forgot-password')
        ->type('email', $user->email)
        ->click('@email-password-reset-link-button')
        ->assertSee('We have emailed your password reset link.');

    Notification::assertSentTo($user, ResetPassword::class);
});
