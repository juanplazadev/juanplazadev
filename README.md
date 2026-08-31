# juanplaza.dev

Personal portfolio. React + TypeScript + Tailwind, built with Vite, with a Laravel backend to come.

## Layout

```
.
├── frontend/          React SPA (Vite)
├── backend/           Laravel — not yet created
├── compose.yaml       development
├── compose.prod.yaml  production
└── .env.example       ports and URLs, shared by compose and vite.config.ts
```

## Ports

| what | port | why |
| --- | --- | --- |
| Vite dev server | `5180` | 5173 is taken by `ibiri-laravel.test-1` |
| the app | `8080` | `npm run preview`, the prod container, and later Laravel |

Both are defined once in `.env` and read by `compose.yaml` and `frontend/vite.config.ts`, so they cannot drift apart.

## Weather

The hero's location pill shows current conditions from [Open-Meteo](https://open-meteo.com),
which is keyless and CORS-open — so this is a plain browser request, not a
proxied one. It is the only live request the app makes.

| var | |
| --- | --- |
| `VITE_WEATHER_LATITUDE` | Shelton, CT 06484 |
| `VITE_WEATHER_LONGITUDE` | |
| `VITE_WEATHER_TIMEZONE` | `America/New_York` |
| `VITE_WEATHER_API_URL` | the forecast endpoint |

Blank or non-numeric coordinates disable the weather and the pill falls back to
plain `Shelton, CT`; a failed request does the same. It never renders an error.

Unlike the ports above, these are read by the *client*, through
`import.meta.env` — and the root `.env` is not visible from inside a container
(the dev bind mount is `./frontend`, and the prod build context is narrower
still). So they are passed explicitly: `environment:` in `compose.yaml`, and
build `args:` in `compose.prod.yaml`, since Vite inlines `VITE_*` into the
bundle at build time. **Changing one means rebuilding the prod image**, not
restarting it.

```
frontend/src/
├── lib/http.ts                       getJson: timeouts, abort, error shape
├── lib/weather.ts                    config, the Open-Meteo call, WMO codes
└── components/ui/use-weather.ts      fetch on mount, refresh every 15 min
```

`lib/http.ts` is the seam the `/api` calls will reuse. When the backend proxies
this, the URL in `lib/weather.ts` is the only thing that changes.

## Getting started

```bash
cp .env.example .env
```

### On the host

```bash
cd frontend
npm install
npm run dev          # http://localhost:5180
```

### In Docker

```bash
docker compose up --build     # http://localhost:5180, container: juanplaza
```

The source is bind-mounted, so edits hot-reload.

## Building

```bash
cd frontend
npm run build        # -> frontend/dist
npm run preview      # http://localhost:8080
```

Other scripts: `npm run lint` (eslint --fix), `npm run format` (prettier). Each
has a non-mutating twin — `lint:check`, `format:check` — which is what CI runs;
the `--fix`/`--write` versions would let a dirty tree pass by rewriting it.

## Production

One container, `juanplaza`, listening on 8080 and joined to the external `proxy`
network that the `caddy` container fronts. It publishes no host ports — Caddy
reaches it by name. The matching Caddyfile entry lives in the separate `caddy`
project:

```
juanplaza.dev {
    reverse_proxy juanplaza:8080
}
```

### Deploying

Push to `prod`. `.github/workflows/deploy.yml` runs on the VPS's self-hosted
runner: it copies `/opt/da-server/juanplazadev/.env` into the workspace, builds
the image, pushes it to `ghcr.io/juanplazadev/juanplazadev` tagged with the commit
SHA and `latest`, brings the stack up, and waits for the healthcheck to pass.

`.github/workflows/ci.yml` gates `main` and `prod` on lint, formatting and
`npm run build` (which is `tsc -b` first).

Because Vite inlines `VITE_*` at build time, **changing a weather value in the
VPS `.env` needs a new deploy**, not a restart — re-run the workflow from the
Actions tab.

To roll back, re-point at an older image instead of rebuilding:

```bash
IMAGE_TAG=<commit sha> docker compose -f compose.prod.yaml up -d
```

By hand, when the runner is down:

```bash
docker compose -f compose.prod.yaml up --build -d
```

## Writing

Posts live in the frontend, not a CMS — there is no backend yet.

```
frontend/src/content/
├── posts.ts           the registry: metadata + a lazy import per post
└── posts/*.tsx        one component per post body, styled by .prose
```

Adding a post is two steps: drop a component in `posts/`, add an entry to the
array in `posts.ts`. Each body is code-split, so prose never lands in the main
bundle. `/blog` lists everything, `/blog/:slug` renders one, and the home page
shows the three most recent.

When the API lands, `posts.ts` is the only module that has to change.

## Architecture pages

Write-ups of how a project is put together, at `/architecture` and
`/architecture/:slug`. Same registry pattern as the blog, so adding one is the
same two steps.

```
frontend/src/
├── content/architectures.ts          the registry: metadata + a lazy import
├── content/architectures/*.tsx       one component per write-up
└── components/ui/diagram/            the SVG diagram primitives
```

Diagrams are hand-authored inline SVG rather than a library: every colour is a
`var(--…)` token, so all six palettes and both themes work with no extra code.
Note that inside an `<svg>`, `text-muted-foreground` sets `color`, not `fill` —
a `<text>` carrying only that class renders black. Point at the tokens directly.

Icons are [Iconify](https://icon-sets.iconify.design) paths vendored into
`components/ui/icons.ts` — monochrome `simple-icons` and `mdi`, rendered with
`currentColor` so they track the palette too. Not a package: `@iconify/react`
fetches from its API at runtime, and `unplugin-icons` emits whole `<svg>`
elements, which cannot nest inside a diagram's own `<svg>`. Use `<Icon />` in the
DOM and `DiagramNode`'s `icon` prop inside a diagram. The set costs about 11 kB
gzipped in the main bundle: it is indexed by name, so none of it tree-shakes, and
the index page's badges reach most of it anyway.

Author diagrams around **560 units wide**. The sheet gives the svg roughly
694px, so text sized in viewBox units lands near its rendered pixel size. Below
`minWidth` the panel scrolls rather than scaling labels down, the same way
`.prose pre` scrolls long lines.

These pages describe live infrastructure and are public. Real hostnames, host
paths and the private-network details stay out of them.

## Backend (planned)

Laravel, serving a JSON API under `/api` **and** the built SPA out of `public/`
— one image, one container, no CORS. The Vite build runs inside the image build
and writes `frontend/dist` into `public/`, so the document root serves both.

Laravel rather than Spring Boot, which this file used to say: the roles this
site is aimed at are Laravel roles, and the backend a PHP candidate chose for
their own site is read as a preference whether or not it was meant as one. The
Spring Boot work goes on the gym app instead, where it is the point rather than
a mixed signal.

When it lands:

- `compose.prod.yaml`'s single service repoints its build context from
  `./frontend` to `./backend`. Nothing else changes.
- In `compose.yaml`, uncomment the `api` service and set
  `VITE_API_PROXY_TARGET` to `http://api:8080`. Dev stays two containers —
  that is the cost of HMR, and why `/api` is proxied at all.
- Laravel needs a catch-all route returning `index.html` for anything not under
  `/api`, or every route but `/` will 404. `frontend/nginx.conf`'s `try_files`
  is the stand-in until then.

## Credits

Based on the [Devfolio](https://cruip.com) template by Cruip, converted from
Next.js to a plain React SPA.
