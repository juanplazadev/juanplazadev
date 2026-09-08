## Juan Plaza

Software engineer with 8+ years building and modernizing production web applications
across defense manufacturing, regulated healthcare, and high-volume logistics. Six of
those years fully remote. I own systems end to end — data model, REST APIs, queues,
integrations, and deployment — and I have a track record of turning brittle legacy code
into maintainable, well-tested platforms.

Every environment I've worked in has been one where getting security wrong is expensive:
HIPAA-regulated healthcare, then defense and government contracts inside a SOX-audited
public company. It shaped how I build — least privilege, auditable by default, hardened
before it ships.

Currently an Application Developer at **RBC Bearings**, replacing aging internal tooling
with React + TypeScript front ends over Java / Spring Boot and Laravel services, without
disrupting the plants that run on them daily.

---

### 🚚 [check-in-v2](https://github.com/juanplazadev/check-in-v2) · [live demo ↗](https://ci.thatdevjp.com)

An appointment scheduling and check-in platform for operations that run on arrivals —
drivers book a slot, arrive, and check in against it across sites.

The first version of this shipped in 2018 and ran nine distribution centers across all
four continental U.S. time zones, so every slot, reminder, and daylight-saving shift has
to resolve in the site's local time rather than the server's. Smoothing truck arrivals at
peak harvest cut produce spoilage 50%, because loaded melons stopped idling on a dock
waiting for a free bay. v2 is the rebuild.

Distance-gated check-in · per-location weekly schedules with per-date overrides, resolved
in each location's own timezone · queued confirmations and reminders · per-location
authorization scoping · passkeys · short links · PDF rendering and hand-rolled Code 39
barcodes as inline SVG.

`Laravel` `Inertia + React` `TypeScript` `PostgreSQL` `Redis + Horizon` `Pest` `Playwright`

### 🌐 [juanplaza.dev](https://juanplaza.dev) · [source](https://github.com/juanplazadev/juanplazadev)

My personal site, and the repo you're reading this in. Markdown posts and architecture
write-ups compiled at save time, so the public read path never parses markdown and there
is no cache to invalidate.

Behind auth it's an operations console rather than a CMS: Cloudflare analytics, a queue
monitor, Sentry errors and deployment history, and résumé email delivery tracked through
Mailgun webhooks.

`Laravel 13` `PHP 8.5` `Octane / FrankenPHP` `Inertia v3 + React 19 (SSR)` `Tailwind v4` `PostgreSQL`

### 🗄️ [phinx — IBM DB2 for i adapter](https://github.com/juanplazadev/phinx/tree/feature/db2-adapter)

A DB2 for i (AS400/iSeries) migration adapter for `cakephp/phinx`, connecting through
`pdo_odbc`. Running against a live Db2 workload before I propose it upstream.

---

### How I ship

Every push to juanplaza.dev is gated on one `composer ci:check` run — frontend lint,
`tsc --noEmit`, and the full suite. The suite is not just "tests pass":

- **≥96% code coverage** and **≥80% type coverage**, both enforced as hard minimums
- **PHPStan / Larastan at level 8**
- `pint --test` and `rector --dry-run`, so style and refactors are checked, not just applied
- Playwright browser tests alongside Pest feature and unit tests

Production deploys are gated on a green CI run, keyed to the exact commit CI tested, and
tagged as Sentry releases so an error on the dashboard maps to the build that caused it.

### Stack

- **Backend** — PHP / Laravel · Java / Spring Boot · PostgreSQL · MySQL · Redis · IBM Db2 for i
- **Frontend** — TypeScript / React · Inertia · Tailwind CSS
- **Infra** — Docker · Linux · AWS · nginx / Caddy · GitHub Actions · Sentry
- **Security** — Role-based access control · per-site authorization scoping · least-privilege access design · encrypted PHI handling · HIPAA compliance · PCI-aware payment flows

### Elsewhere

[juanplaza.dev](https://juanplaza.dev) · [LinkedIn](https://www.linkedin.com/in/juan-plaza-59a6a9296) · [juan@juanplaza.dev](mailto:juan@juanplaza.dev)

---

<sub>This repo is both my GitHub profile and the source of juanplaza.dev. To run the site
locally, see **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.</sub>
