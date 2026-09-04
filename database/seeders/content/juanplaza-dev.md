A React single-page app with no backend, which makes the interesting part the
boundary around it rather than anything inside it: how it is served, how it is
built, and what happens on a deploy.

::block{key="stack"}

::block{key="request-path"}

## The edge

Caddy runs in its own project and fronts every container on the box. It gets a
certificate over the ACME DNS challenge, which means it never needs port 80
reachable and can issue for hosts that are not publicly resolvable. Renewal is
automatic and unattended; there is no cron job and nothing to remember.

The site's container publishes **no host ports at all**. It joins a shared Docker
network that Caddy is also on, and Caddy reaches it by service name:

```caddyfile
reverse_proxy juanplaza:8080
```

That is worth more than it looks. A port that is never bound cannot collide with
another project on the same box, cannot be reached around the proxy, and cannot
accidentally be exposed by a firewall rule someone changes later. The container
is unreachable except through Caddy, by construction rather than by policy.

## No database

There is no API and no CMS. Blog posts are TypeScript modules - a registry of
metadata plus a lazy import per post - so each body is code-split and prose never
lands in the main bundle. Publishing is a commit, and the content is typechecked
along with everything else.

The single live request the app makes is to Open-Meteo for the conditions in the
hero's location pill. That API is keyless and CORS-open, so it goes straight from
the browser rather than through a proxy - which is why it sits outside the box in
the diagram above. If the coordinates are blank or the request fails, the pill
falls back to a plain location label. It never renders an error.

## Deploying

::block{key="deploy-pipeline"}

A separate workflow gates both `main` and the production branch on lint,
formatting and the build - and the build script is `tsc -b && vite build`, so a
type error fails CI too. CI runs the non-mutating twins of the lint and format
scripts on purpose: the `--fix` and `--write` versions would let a dirty tree
pass by quietly rewriting it.

Three decisions in here took a second pass to get right.

- **Config crosses as build args, not environment.** Vite inlines `VITE_*` into
  the bundle at build time, so a changed value is a changed bundle. Passing them
  as runtime environment would look like it worked and silently do nothing - the
  deployed JavaScript already has the old value baked in. Changing one means a
  rebuild, not a restart.
- **The healthcheck hits `127.0.0.1`, not `localhost`.** On this image
  `localhost` resolves to `::1` first and nginx binds IPv4-only, so the check hit
  a closed IPv6 socket and the container sat permanently unhealthy while serving
  traffic perfectly well.
- **Rollback re-points, it does not rebuild.** Every image is tagged with its
  commit SHA, so going back is starting an image that already exists and has
  already been tested - not rebuilding an old commit on a toolchain that has
  moved since.

## What changes next

The planned Laravel backend serves the JSON API _and_ the built SPA from the same
image, so there is one container, one origin and no CORS. The Vite build runs in
the image build and writes into `public/`, which is the document root either way.

The production compose file then repoints a single build context and nothing else
moves: same service name, same container name, same port, same network, same
healthcheck path - so the Caddy config never changes. The one thing that does
need writing is a catch-all route returning `index.html` for anything that is not
under `/api`, which is what nginx's `try_files` is standing in for today. Without
it every route but `/` would 404 on a hard refresh.
