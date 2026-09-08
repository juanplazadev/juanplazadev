<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\ArchitectureController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DeliveriesController;
use App\Http\Controllers\Admin\DeploymentsController;
use App\Http\Controllers\Admin\ErrorsController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\PreviewController;
use App\Http\Controllers\Admin\QueueController;
use Illuminate\Support\Facades\Route;

/*
  The admin panel.

  `/` is the overview - the daily glance - and everything under it is one
  section answering one question. The root keeps the name `admin.dashboard`
  because config/fortify.php and the passkey verify fallback both point at the
  URL `/dashboard`, and the traffic panel that used to live here moved down to
  `analytics` rather than taking the root's name with it.

  Authorization is the middleware and nothing more: this is a single-author
  site, so a policy that returned true for the only user would be ceremony.
  That changes the day a second author exists.
*/
Route::middleware(['auth', 'verified'])
    ->prefix('dashboard')
    ->name('admin.')
    ->group(function (): void {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics');
        Route::get('errors', [ErrorsController::class, 'index'])->name('errors');
        Route::get('deployments', [DeploymentsController::class, 'index'])->name('deployments');
        Route::get('deliveries', [DeliveriesController::class, 'index'])->name('deliveries');
        Route::get('queue', [QueueController::class, 'index'])->name('queue');

        /*
          The panel's only routes that reach past the request, so the only ones
          carrying a throttle. Each maps to one fixed Artisan command and takes
          no argument but a route-bound uuid - see App\Queue\QueueControl for
          why that boundary is the whole point.
        */
        Route::post('queue/restart', [QueueController::class, 'restart'])
            ->middleware('throttle:6,1')
            ->name('queue.restart');
        Route::post('queue/failed/{failedJob}/retry', [QueueController::class, 'retry'])
            ->middleware('throttle:20,1')
            ->name('queue.failed.retry');
        Route::delete('queue/failed/{failedJob}', [QueueController::class, 'forget'])
            ->middleware('throttle:20,1')
            ->name('queue.failed.forget');
        Route::resource('posts', PostController::class)->except('show');
        Route::resource('architectures', ArchitectureController::class)->except('show');
        Route::post('content/preview', PreviewController::class)->name('content.preview');
    });
