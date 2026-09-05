<?php

declare(strict_types=1);

use App\Http\Controllers\ArchitectureController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

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
