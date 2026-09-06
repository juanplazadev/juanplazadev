<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\ArchitectureController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DeploymentsController;
use App\Http\Controllers\Admin\ErrorsController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\PreviewController;
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
        Route::resource('posts', PostController::class)->except('show');
        Route::resource('architectures', ArchitectureController::class)->except('show');
        Route::post('content/preview', PreviewController::class)->name('content.preview');
    });
