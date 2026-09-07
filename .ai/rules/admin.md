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

## /dashboard/deliveries is the one section page with an eager data prop
Every other section page defers: traffic, errors and deployments are each a network hop to a
vendor that rate-limits, degrades and needs an error string rendered for it, and deferring is what
keeps one throttled vendor from delaying a card it has nothing to do with. The deliveries page is
six counts and a fifty-row select against two local tables, so a deferred prop there would buy a
second round trip and a skeleton for data already in hand. Same reasoning as `content` on the
overview. Pinned by 'the page resolves its deliveries inline rather than deferring them'.

For the same reason the overview's `deliveries` prop is NOT a fourth deferred group. A group costs
a parallel HTTP request, which is the wrong trade for a local aggregate - and the group count is
itself pinned by 'each deferred group is announced under its own name', which fails if one is
added. Three components read that one prop: the health strip tile, the section card, and the
"Needs attention" bounce entry.

`DeliveriesRequest` sanitises BOTH `range` and `status` away in `prepareForValidation()` rather
than failing them, for the reason `AnalyticsRequest` does it for `range` alone: both are links in
the page, so a stale bookmark renders the default view instead of a 422.

The status filter reuses `components/admin/range-picker.tsx` rather than copying it - it is
already generic over `{value, label}`, and a near-duplicate is exactly what that directory exists
to prevent. "All" is a client-side sentinel that drops the parameter from the URL entirely.
