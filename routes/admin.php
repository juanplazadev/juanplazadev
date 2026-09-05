<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\ArchitectureController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\PreviewController;
use Illuminate\Support\Facades\Route;

/*
  The content editor.

  Authorization is the middleware and nothing more: this is a single-author
  site, so a policy that returned true for the only user would be ceremony.
  That changes the day a second author exists.
*/
Route::middleware(['auth', 'verified'])
    ->prefix('dashboard')
    ->name('admin.')
    ->group(function (): void {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::resource('posts', PostController::class)->except('show');
        Route::resource('architectures', ArchitectureController::class)->except('show');
        Route::post('content/preview', PreviewController::class)->name('content.preview');
    });
