<?php

declare(strict_types=1);

use App\Http\Controllers\ArchitectureController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MailgunWebhookController;
use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

/*
 * The hero's résumé dialog. Throttled hard because it is an unauthenticated
 * endpoint that sends mail on demand: Turnstile stops the bots that run a
 * browser, and this stops the ones that just POST.
 */
Route::post('resume', [HomeController::class, 'resume'])
    ->middleware('throttle:5,1')
    ->name('resume.request');

/*
 * Mailgun's delivery events. Public by necessity - a webhook cannot log in - so
 * the HMAC signature is the access control, and CSRF is excluded for it in
 * bootstrap/app.php. The limit is generous: throttling a provider's retries
 * into 429s would lose events.
 */
Route::post('webhooks/mailgun', MailgunWebhookController::class)
    ->middleware('throttle:120,1')
    ->name('webhooks.mailgun');

Route::get('blog', [PostController::class, 'index'])->name('posts.index');
Route::get('blog/{slug}', [PostController::class, 'show'])
    ->where('slug', '[a-z0-9-]+')
    ->name('posts.show');

Route::get('architecture', [ArchitectureController::class, 'index'])->name('architecture.index');
Route::get('architecture/{slug}', [ArchitectureController::class, 'show'])
    ->where('slug', '[a-z0-9-]+')
    ->name('architecture.show');

require __DIR__.'/admin.php';
require __DIR__.'/settings.php';
