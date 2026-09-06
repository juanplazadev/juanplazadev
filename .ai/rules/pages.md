---
paths:
  - '{routes/admin.php,app/Http/Controllers/Admin/**,resources/js/pages/dashboard.tsx}'
---

# Pages

## /dashboard is the admin root, and its route name is admin.dashboard
The dashboard is the index of the admin group, not a separate page: `routes/admin.php` already prefixes `dashboard` and names `admin.`, so the route is registered there as `Route::get('/', ...)->name('dashboard')`. URL `/dashboard`, route name `admin.dashboard`.

Consequence for the frontend: wayfinder emits it from `resources/js/routes/admin/index.ts`, so the import is `import { dashboard } from '@/routes/admin'` - `@/routes` no longer exports it. `config/fortify.php`'s `home` and the fallback in `passkey-verify.tsx` hardcode the path `/dashboard`, so they are unaffected by a name change but would break on a URL change.

`?range=` goes through `App\Http\Requests\Admin\DashboardRequest`, which sanitises an unrecognised value away in `prepareForValidation()` rather than failing it. That is deliberate - the range is a link in the page, so a stale bookmark renders the default dashboard instead of an error - and it is pinned by the test 'an unrecognised range falls back to the default instead of failing'.
