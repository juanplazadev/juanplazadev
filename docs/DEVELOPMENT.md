# Development

Local development for [juanplaza.dev](https://juanplaza.dev), via Laravel Sail.
For what the project is and why, see the [README](../README.md).

## Stack

| Layer              | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| Backend            | Laravel 13                                              |
| Language           | PHP 8.5                                                 |
| Application server | Octane on FrankenPHP                                    |
| Testing            | Pest 5 (87 tests)                                       |
| Database           | PostgreSQL 18 · SQLite in-memory for the test suite     |
| Frontend           | React 19 · TypeScript · Inertia.js v3 · Tailwind CSS v4 |
| Build              | Vite 8 (via `vite-plus`)                                |
| Mail               | Mailpit (local)                                         |

## Laravel Packages & Tooling

| Tool      | Purpose                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------- |
| Sail      | Docker-based local development environment                                                     |
| Octane    | High-performance application server (FrankenPHP), running in watch mode                        |
| Inertia   | Server-driven SPA - React pages rendered from Laravel controllers, with SSR                    |
| Fortify   | Headless authentication backend - login, password reset and passkeys (custom Inertia/React UI) |
| Wayfinder | Generates TypeScript functions for Laravel routes and controller actions                       |
| Pint      | PHP code style fixer (wrapper around PHP-CS-Fixer), with a custom ruleset                      |
| Larastan  | Static analysis (PHPStan for Laravel) at level 8                                               |
| Pest      | Test runner (wrapper around PHPUnit)                                                           |
| Pail      | Tails the application log from the command line                                                |
| Pao       | Agent-optimized output for PHP testing tools                                                   |
| Boost     | MCP server exposing schema, logs and documentation search to AI agents                         |

Registration is deliberately not enabled: this is a single-author site, so the
only account is the one the seeder creates.

## Requirements

- [Composer](https://getcomposer.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# Install Composer (macOS)
brew install composer
```

## Installation

```bash
# 1. Clone the repository
git clone git@github.com:juanplazadev/juanplazadev.git && cd juanplazadev

# 2. Install PHP dependencies (Sail itself lives here, so this comes first)
composer install

# 3. Copy environment file
cp .env.example .env

# 4. Start Docker containers
./vendor/bin/sail up -d

# 5. Generate application key
./vendor/bin/sail artisan key:generate

# 6. Install frontend dependencies
./vendor/bin/sail npm install

# 7. Run migrations and seed the content
./vendor/bin/sail artisan migrate --seed

# 8. Start the Vite dev server
./vendor/bin/sail npm run dev
```

Seeding creates `test@example.com` / `password` and loads the posts and
architecture entries from `database/seeders/content/`.

## Accessing the Application

| Service         | URL                   |
| --------------- | --------------------- |
| Web application | http://localhost:8080 |
| Vite dev server | http://localhost:5180 |
| Mailpit inbox   | http://localhost:8025 |

Both ports are set once in `.env` (`APP_PORT`, `VITE_PORT`) and read from there
by `compose.yaml`, so they cannot drift. 5180 rather than Vite's default 5173,
which another local site already holds.

## Development

> 💡 Octane runs with `--watch`, so backend changes are picked up with no server
> restart. See `SUPERVISOR_PHP_COMMAND` in `compose.yaml`.

### Frontend

```bash
./vendor/bin/sail npm run dev        # dev server, with SSR
./vendor/bin/sail npm run build      # client bundle
./vendor/bin/sail npm run build:ssr  # client + SSR bundle, what CI builds
```

SSR is enabled (`config/inertia.php`) and served by the `@inertiajs/vite` plugin
in development - no separate `inertia:start-ssr` process is needed locally.

The build is also what generates the Wayfinder output under
`resources/js/{actions,routes,wayfinder}`. Those directories are gitignored, so
a fresh clone must build once before type checking will pass.

### Content

`Post` and `Architecture` store a markdown `body` plus named JSON `blocks`
(diagrams, spec lists). `App\Content\BodyRenderer` splits the body on
`::block{key="..."}` directives and compiles the result into the `rendered`
column on save, so the public read path never parses markdown and there is no
cache to invalidate. A row with a null or future `published_at` is a draft:
guests get a 404, an authenticated user sees it at its real URL.

Both are edited in the dashboard, at `/dashboard/posts` and
`/dashboard/architectures`.

### Environment

The hero's location pill shows current conditions from
[Open-Meteo](https://open-meteo.com), which is keyless and CORS-open, so the
browser calls it directly.

| Variable                 |                       |
| ------------------------ | --------------------- |
| `VITE_WEATHER_LATITUDE`  | Shelton, CT 06484     |
| `VITE_WEATHER_LONGITUDE` |                       |
| `VITE_WEATHER_TIMEZONE`  | `America/New_York`    |
| `VITE_WEATHER_API_URL`   | the forecast endpoint |

Blank or non-numeric coordinates disable the weather and the pill falls back to
plain `Shelton, CT`; a failed request does the same. It never renders an error.
Vite inlines `VITE_*` at build time, so a changed value means a rebuild, not a
restart.

### Code Style (Pint)

Uses extensive custom rules defined in `pint.json` - including
`declare_strict_types`, `final_class`, `strict_comparison`,
`ordered_class_elements`, and more. See `pint.json` for the full ruleset.

```bash
./vendor/bin/pint            # fix all files
./vendor/bin/pint --dirty    # fix only uncommitted files
./vendor/bin/pint --test     # dry-run (report without fixing)
```

### Static Analysis (Larastan)

Runs at **level 8** (out of 10). Configuration in `phpstan.neon`.

```bash
./vendor/bin/phpstan analyse --memory-limit=2G
```

### Frontend Checks

```bash
./vendor/bin/sail npm run check        # lint (type-aware, warnings are errors)
./vendor/bin/sail npm run check:fix    # lint and format in place
./vendor/bin/sail npm run types:check  # tsc --noEmit
```

### Tests

The suite runs against SQLite in memory (`phpunit.xml`), so it does not touch
the Postgres container.

```bash
./vendor/bin/sail artisan test                                     # all tests
./vendor/bin/sail artisan test --compact                           # compact output
./vendor/bin/sail artisan test --parallel                          # run in parallel
./vendor/bin/sail artisan test --filter="raw html never survives"  # a single test
./vendor/bin/sail pest tests/Unit/BodyRendererTest.php             # a single file
```

`./vendor/bin/pest` runs the same suite directly, with the same arguments.
