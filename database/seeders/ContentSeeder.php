<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Architecture;
use App\Models\Post;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use RuntimeException;
use Throwable;

/**
 * Bootstraps the content that used to live in app/Content and in a page
 * component per slug.
 *
 * firstOrCreate, not updateOrCreate: once the admin UI exists the database is
 * the source of truth, and a re-run of this seeder must not silently revert a
 * post someone has since edited. To rebuild from these files deliberately, use
 * `migrate:fresh --seed`.
 */
final class ContentSeeder extends Seeder
{
    /**
     * @throws Throwable
     */
    public function run(): void
    {
        Post::query()->firstOrCreate(['slug' => 'automatic-https-with-caddy'], [
            'title' => "Automatic HTTPS with Caddy and Let's Encrypt",
            'summary' => 'Caddy issues and renews certificates on its own. Here is the whole setup that fronts every container on this box, and the two things that actually go wrong.',
            'tags' => ['Caddy', "Let's Encrypt", 'Docker', 'TLS'],
            'reading_minutes' => 5,
            'published_at' => CarbonImmutable::parse('2026-08-24'),
            ...$this->body('automatic-https-with-caddy'),
        ])->compileBody()->save();

        Architecture::query()->firstOrCreate(['slug' => 'juanplaza-dev'], [
            'title' => 'juanplaza.dev',
            'tagline' => 'This site. Laravel on Octane in one container behind Caddy, deployed from a self-hosted runner on the same box it serves from.',
            'status' => 'Live',
            'active' => true,
            'position' => 0,
            'stack' => [
                ['label' => 'Laravel 13', 'icon' => 'laravel'],
                ['label' => 'PHP 8.5', 'icon' => 'php'],
                ['label' => 'Inertia + React 19', 'icon' => 'inertia'],
                ['label' => 'Vite', 'icon' => 'vite'],
                ['label' => 'Tailwind v4', 'icon' => 'tailwind'],
                ['label' => 'PostgreSQL 18', 'icon' => 'postgresql'],
                ['label' => 'Caddy', 'icon' => 'caddy'],
                ['label' => 'GitHub Actions', 'icon' => 'githubActions'],
                ['label' => 'Sentry', 'icon' => 'sentry'],
            ],
            'links' => null,
            'published_at' => CarbonImmutable::parse('2026-08-24'),
            ...$this->body('juanplaza-dev'),
        ])->compileBody()->save();

        Architecture::query()->firstOrCreate(['slug' => 'check-in'], [
            'title' => 'Check-in',
            'tagline' => 'Appointment scheduling and driver check-in across sites. Laravel on Octane, with queues, PDFs and SMS behind it.',
            'status' => 'In development',
            'active' => false,
            'position' => 1,
            'stack' => [
                ['label' => 'Laravel 13', 'icon' => 'laravel'],
                ['label' => 'PHP 8.5', 'icon' => 'php'],
                ['label' => 'Inertia + React', 'icon' => 'inertia'],
                ['label' => 'Vite', 'icon' => 'vite'],
                ['label' => 'Tailwind v4', 'icon' => 'tailwind'],
                ['label' => 'PostgreSQL', 'icon' => 'postgresql'],
                ['label' => 'Redis', 'icon' => 'redis'],
                ['label' => 'Horizon', 'icon' => 'laravelHorizon'],
                ['label' => 'Caddy', 'icon' => 'caddy'],
                ['label' => 'GitHub Actions', 'icon' => 'githubActions'],
            ],
            'links' => [
                ['label' => 'Live demo', 'href' => 'https://ci.thatdevjp.com'],
                ['label' => 'Source', 'href' => 'https://github.com/juanplazadev/check-in-v2'],
            ],
            'published_at' => CarbonImmutable::parse('2026-08-24'),
            ...$this->body('check-in'),
        ])->compileBody()->save();
    }

    /**
     * The markdown body and its named blocks, read from database/seeders/content.
     *
     * Kept as files rather than heredocs so the prose stays diffable against the
     * page components it was converted from, and so the JSON can be validated by
     * anything that reads JSON.
     *
     * @return array{body: string, blocks: array<string, mixed>|null}
     *
     * @throws Throwable
     */
    private function body(string $slug): array
    {
        $directory = __DIR__.'/content';
        $markdown = "{$directory}/{$slug}.md";

        throw_unless(is_file($markdown), RuntimeException::class, "Missing seed body for [{$slug}] at {$markdown}.");

        $blocks = "{$directory}/{$slug}.json";

        return [
            'body' => (string) file_get_contents($markdown),
            'blocks' => is_file($blocks)
                ? json_decode((string) file_get_contents($blocks), true, flags: JSON_THROW_ON_ERROR)
                : null,
        ];
    }
}
