<?php

declare(strict_types=1);

namespace App\Providers;

use App\Http\Middleware\HandleInertiaRequests;
use App\Services\Cloudflare\CachedSiteAnalytics;
use App\Services\Cloudflare\CloudflareGraphQlClient;
use App\Services\Cloudflare\SiteAnalytics;
use App\Services\Sentry\CachedErrorInsights;
use App\Services\Sentry\ErrorInsights;
use App\Services\Sentry\SentryApiClient;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

final class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->registerAnalytics();
        $this->registerErrorInsights();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureErrorPages();
    }

    /**
     * Wire the Cloudflare analytics stack.
     *
     * scoped(), not singleton(): Octane boots the container once and reuses it
     * across requests, so a singleton here would outlive the request that built
     * it and keep whatever config it captured even after a config:cache reload.
     */
    private function registerAnalytics(): void
    {
        $this->app->scoped(CloudflareGraphQlClient::class, fn (): CloudflareGraphQlClient => new CloudflareGraphQlClient(
            config('services.cloudflare.api_token'),
        ));

        $this->app->scoped(SiteAnalytics::class, fn ($app): SiteAnalytics => new SiteAnalytics(
            $app->make(CloudflareGraphQlClient::class),
            config('services.cloudflare.account_id'),
            config('services.cloudflare.site_tag'),
            config('services.cloudflare.zone_id'),
        ));

        $this->app->scoped(CachedSiteAnalytics::class, fn ($app): CachedSiteAnalytics => new CachedSiteAnalytics(
            $app->make(SiteAnalytics::class),
        ));
    }

    /**
     * Wire the Sentry error insights stack.
     *
     * scoped() for the same Octane reason as the analytics stack above, and
     * separate from it on purpose: the two providers share a page shape but not
     * a credential, an endpoint, or a failure mode.
     */
    private function registerErrorInsights(): void
    {
        $this->app->scoped(SentryApiClient::class, fn (): SentryApiClient => new SentryApiClient(
            config('services.sentry.api_token'),
            config('services.sentry.api_url'),
        ));

        $this->app->scoped(ErrorInsights::class, fn ($app): ErrorInsights => new ErrorInsights(
            $app->make(SentryApiClient::class),
            config('services.sentry.organization'),
            config('services.sentry.project'),
            (int) config('services.sentry.monthly_error_quota'),
        ));

        $this->app->scoped(CachedErrorInsights::class, fn ($app): CachedErrorInsights => new CachedErrorInsights(
            $app->make(ErrorInsights::class),
        ));
    }

    /**
     * Render HTTP errors as Inertia pages so they keep the site chrome.
     *
     * withSharedData() matters here: without it the error page renders without
     * the palette and appearance props, and a 404 would come back unstyled.
     */
    private function configureErrorPages(): void
    {
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response): ?ExceptionResponse {
            if ($response->statusCode() !== 404) {
                return null;
            }

            return $response
                ->render('errors/404')
                ->usingMiddleware(HandleInertiaRequests::class)
                ->withSharedData();
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    private function configureDefaults(): void
    {
        $this->immutableDates();

        $this->defaultTimezone();

        // TODO: Enable once in prod
        // $this->prohibitDestructiveCommands();

        $this->setPasswordDefault();

        $this->aggressivePrefetching();

        $this->autoEagerLoadRelationships();

        $this->forceHttps();

        $this->strictModels();

        $this->unguardModels();
    }

    private function immutableDates(): void
    {
        Date::use(CarbonImmutable::class);
    }

    private function setPasswordDefault(): void
    {
        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    private function aggressivePrefetching(): void
    {
        Vite::useAggressivePrefetching();
    }

    private function autoEagerLoadRelationships(): void
    {
        Model::automaticallyEagerLoadRelationships();
    }

    private function forceHttps(): void
    {
        if (app()->isProduction()) {
            URL::forceHttps();
        }
    }

    private function strictModels(): void
    {
        if (! app()->isProduction()) {
            Model::shouldBeStrict();
        }
    }

    private function unguardModels(): void
    {
        Model::unguard();
    }

    private function defaultTimezone(): void
    {
        date_default_timezone_set(config('app.timezone'));
    }
}
