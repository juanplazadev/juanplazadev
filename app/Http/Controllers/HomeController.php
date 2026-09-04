<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

final class HomeController extends Controller
{
    /**
     * Show the landing page.
     */
    public function index(): Response
    {
        return Inertia::render('home');
    }
}
