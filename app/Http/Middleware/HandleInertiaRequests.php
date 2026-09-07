<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\Console;
use App\Enums\Palette;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Override;

final class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    #[Override]
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'palette' => Palette::fromRequest($request->cookie(Palette::COOKIE))->value,
            'palettes' => Palette::options(),
            /*
             * The panel's Consoles menu. Gated on the user because the entries
             * carry the Sentry org slug, the Cloudflare account id and the
             * Mailgun domain - operational detail with no business in a public
             * visitor's page payload.
             */
            'consoles' => $request->user() !== null ? Console::options() : [],
            'hiring' => config()->boolean('site.hiring'),
            /*
             * Null switches the résumé form's challenge off in the browser, and
             * TurnstileVerifier switches it off on the server for the same
             * reason - an unset secret. Shared rather than inlined into the
             * bundle so the key can change without a rebuild.
             */
            'turnstileSiteKey' => config('services.turnstile.site_key'),
        ];
    }
}
