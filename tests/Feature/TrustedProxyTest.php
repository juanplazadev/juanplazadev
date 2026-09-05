<?php

declare(strict_types=1);

use Illuminate\Http\Middleware\TrustHosts;
use Illuminate\Http\Request;

/*
 * Caddy terminates TLS and forwards plain HTTP to the container, so these
 * cover the forwarded headers the app has to believe. APP_ENV is `testing`
 * here, which makes AppServiceProvider's URL::forceHttps() inert - so what
 * passes below is the proxy trust itself, not the backstop hiding it.
 */

test('a forwarded https request is treated as secure', function (): void {
    $this->withHeader('X-Forwarded-Proto', 'https')->get('/')->assertOk();

    expect(request()->isSecure())->toBeTrue();
});

test('generated asset urls follow the forwarded scheme', function (): void {
    $this->withHeader('X-Forwarded-Proto', 'https')->get('/')->assertOk();

    expect(asset('build/assets/app.js'))->toStartWith('https://');
});

test('the visitor ip comes from the forwarded header, not the proxy', function (): void {
    $this->withHeaders([
        'X-Forwarded-Proto' => 'https',
        'X-Forwarded-For' => '203.0.113.10',
    ])->get('/')->assertOk();

    expect(request()->ip())->toBe('203.0.113.10');
});

test('an unforwarded request stays http', function (): void {
    $this->get('/')->assertOk();

    expect(request()->isSecure())->toBeFalse();
});

/*
 * TrustHosts is inert in local and under the test runner, so the pin itself
 * cannot be exercised here - but the invariant it broke can. The container's
 * healthcheck curls the app over loopback, where the Host header is whatever
 * the Dockerfile sends; if that host is not one the pin trusts, Symfony answers
 * 400, the healthcheck never passes and the deploy fails with the app healthy.
 */
test('the Dockerfile healthcheck uses a host the app trusts', function (): void {
    preg_match('/curl [^\n]*-H \'Host: ([^\']+)\'/', file_get_contents(base_path('Dockerfile')), $matches);

    $host = $matches[1] ?? null;

    expect($host)->not->toBeNull('The Dockerfile healthcheck must send a Host header.');

    // Static, process-wide state, and this app runs on Octane: always reset it.
    Request::setTrustedHosts(array_filter((new TrustHosts(app()))->hosts()));

    try {
        expect(Request::create("http://{$host}/up")->getHost())->toBe($host);
    } finally {
        Request::setTrustedHosts([]);
    }
});
