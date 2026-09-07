---
paths:
  - '{routes/admin.php,app/Http/Controllers/Admin/**,resources/js/pages/dashboard.tsx,resources/js/pages/admin/analytics.tsx}'
---

# Admin

## /dashboard is the overview; the traffic panel lives at admin.analytics
The admin root is a digest, not a section. `Route::get('/', DashboardController)->name('dashboard')` renders `dashboard` (the overview); the Cloudflare panel it used to hold moved to `AnalyticsController` at `admin.analytics` (`/dashboard/analytics`, component `admin/analytics`), and `DashboardRequest` was renamed `AnalyticsRequest` with it.

Keep the root's URL and name. `config/fortify.php`'s `home` and the fallback in `passkey-verify.tsx` hardcode the path `/dashboard`, so a name change is survivable but a URL change is not.

The overview pins `AnalyticsRange::default()` and takes no `?range=`. That is the point, not a shortcut: both vendor caches key on the range, so asking at the default lands on the exact entries the section pages use when reached with no query string. Visiting the overview warms them and vice versa. Adding a picker here would fork those keys and double the vendor traffic - pinned by 'the overview warms the caches the section pages read'.

It sends three deferred props in three named groups (`traffic`, `health`, `deploys`), not one. Grouped deferred props are fetched in parallel requests, so a throttled Sentry delays its own card instead of blanking the traffic card beside it. Pinned by 'each deferred group is announced under its own name'.

`?range=` on the traffic page goes through `App\Http\Requests\Admin\AnalyticsRequest` (renamed from `DashboardRequest`), which sanitises an unrecognised value away in `prepareForValidation()` rather than failing it. Deliberate: the range is a link in the page, so a stale bookmark renders the default panel instead of an error. Pinned by 'an unrecognised range falls back to the default instead of failing'.

Wayfinder emits these from `resources/js/routes/admin/index.ts`, so the imports are `import { dashboard, analytics, errors, deployments } from '@/routes/admin'` - `@/routes` does not export them. Regenerate with `php artisan wayfinder:generate --with-form`; without the flag the `.form` variants the CRUD pages rely on disappear and `tsc` fails across a dozen files.
