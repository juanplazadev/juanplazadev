<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\Palette;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the accent palette for this request.
 *
 * Sibling of HandleAppearance. Sharing it with the Blade view is what lets the
 * server stamp data-palette on <html> before anything paints, which is the
 * whole reason the preference is a cookie and not localStorage alone.
 */
final class HandlePalette
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $palette = Palette::fromRequest($request->cookie(Palette::COOKIE));

        View::share('palette', $palette->value);
        View::share('palettes', Palette::values());

        return $next($request);
    }
}
