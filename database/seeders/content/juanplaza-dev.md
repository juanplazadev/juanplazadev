Laravel 13 and Inertia behind one container on a small VPS, with the React it
renders built into the same image. It started as a static single-page app with
no backend at all, and most of what is interesting is still the boundary around
it rather than anything inside it: how it is served, how it is built, and what
happens on a deploy.

::block{key="stack"}

::block{key="request-path"}

## The edge

Caddy runs in its own project and fronts every container on the box. It gets its
certificate from Let's Encrypt and renews it automatically and unattended; there
is no cron job and nothing to remember.

The site's container publishes **no host ports at all**. It joins a shared Docker
network that Caddy is also on, and Caddy reaches it by service name:

```caddyfile
reverse_proxy juanplaza:8080
```

That is worth more than it looks. A port that is never bound cannot collide with
another project on the same box, cannot be reached around the proxy, and cannot
accidentally be exposed by a firewall rule someone changes later. The container
is unreachable except through Caddy, by construction rather than by policy.

The same argument runs one layer deeper. Postgres is on a second network the
proxy is not on, so there is no configuration in which Caddy could route to the
database - not a rule that forbids it, an absence of any path at all. Inside the
container, Octane serves on 8080 and the Inertia SSR process listens on loopback
13714, which is not reachable from outside the container by design.

## The content is in the database

This page is a row. A post is markdown plus a JSON object of named blocks - the
two diagrams above are entries in it - and the markdown is compiled to HTML on
write rather than on read, so serving a page never parses markdown and there is
no cache to invalidate. Publishing is a database write behind an authenticated,
verified session, not a commit.

That is a genuine reversal. The earlier version of this site had no API and no
CMS: posts were TypeScript modules, code-split by a lazy import per slug, and
publishing meant pushing to a branch. It was a good fit for prose that never
changed and a bad one for everything else, and the moment content needed editing
without a deploy it stopped paying for itself.

What the move costs is a class of mistake the compiler used to catch. A block
key referenced by the markdown but missing from the JSON is dropped silently at
render time, so the diagram just is not there. That gap is closed by a test
rather than by types: the suite asserts that every block a body references
actually resolves, that every stored block passes the same validation rule the
admin form uses, and that every icon named anywhere in the content exists in the
icon set - a typo there renders a blank space, silently, and nothing else would
tell you.

The single live request the app makes from the browser is to Open-Meteo for the
conditions in the hero's location pill. That API is keyless and CORS-open, so it
goes straight from the browser rather than through a proxy - which is why it sits
outside the box in the diagram above. If the coordinates are blank or the request
fails, the pill falls back to a plain location label. It never renders an error.

## Building the image

The image is built in stages off a single FrankenPHP base, and the base exists
because the PHP extensions are needed by three of them. Compiling ICU and zip
once instead of three times is most of the build's wall-clock difference.

Two things about that build are not obvious:

- **The asset build needs PHP, not just Node.** The Wayfinder plugin shells out
  to `artisan` to enumerate the application's routes and generate typed helpers
  from them, so the frontend stage has to pull `vendor/` and the package
  manifest from the Composer stage before Vite will run at all.
- **`node_modules` ships in the runtime image.** The SSR bundle externalizes its
  bare imports rather than inlining them, so React and everything it renders with
  have to be present at runtime. They live in `dependencies` rather than
  `devDependencies` precisely so `npm ci --omit=dev` keeps them.

Config crosses into the image as build args, not environment. Vite inlines
`VITE_*` into the bundle at build time, so a changed value is a changed bundle.
Passing them as runtime environment would look like it worked and silently do
nothing - the deployed JavaScript already has the old value baked in. Changing
one means a rebuild, not a restart.

## Deploying

::block{key="deploy-pipeline"}

CI gates the deploy rather than running beside it: the deploy workflow triggers
on a _completed_ run of the test workflow and refuses to proceed unless that run
was green. The subtlety is that a workflow triggered this way fires against the
default branch, so the commit it thinks it is running for is not the commit that
was tested. The head SHA of the triggering run is, and every step downstream -
the checkout, the image tag, the commit baked into the container - keys off that
one value, so what ships is exactly what went green.

The release itself is four steps that have to happen in that order. `up -d`
recreates the container. Migrations run next, gated by the database's own
healthcheck. Then `optimize` writes the config and route cache - and it is
immediately followed by `octane:reload`, which is not optional: the workers
booted before that cache existed, so without the reload they keep serving from
the configuration they started with. Finally the deploy polls the container
healthcheck, because `up -d` returns as soon as the container is _created_,
which would make a container that crashes on boot look like a green deploy.

There is no seeding step, and that absence is deliberate. The seeder creates a
user with a known password, and the content editor sits behind nothing but an
authenticated, verified session. The first account was made by hand, once.

Two more decisions in here took a second pass to get right.

- **The healthcheck hits `127.0.0.1`, not `localhost`, and it checks two ports.**
  On this image `localhost` resolves to `::1` first while both processes bind
  IPv4, so the check hit a closed IPv6 socket and the container sat permanently
  unhealthy while serving traffic perfectly well. It curls Octane _and_ the SSR
  process because a dead SSR child otherwise leaves the container looking fine
  while it quietly stops server-rendering.
- **Rollback re-points, it does not rebuild.** Every image is tagged with its
  commit SHA, so going back is starting an image that already exists and has
  already been tested - not rebuilding an old commit on a toolchain that has
  moved since.

## What CI actually gates

Lint, format and static analysis on both sides - Pint and Rector for PHP,
PHPStan over the whole application, the toolchain's own lint and format checks
for the frontend, and `tsc --noEmit` on top. Then the Pest suite, with a line
coverage floor asserted as an exact number rather than a minimum, and a separate
type-coverage threshold.

Two details that are easy to get wrong. CI runs the **non-mutating twins** of
every tool that can rewrite the tree: `--test`, `--dry-run`, and the check
command without its `--fix`. The fixing versions would let a dirty tree pass by
quietly correcting it on the way through, which is the opposite of what a gate
is for.

And the build has to run _before_ the type check, not after. Wayfinder's
generated route helpers are gitignored - they are derived from PHP, so committing
them would mean a second source of truth that can drift - which means a fresh
checkout has no `@/routes` or `@/actions` for TypeScript to resolve until the
build has produced them. Reorder those two steps and the type check fails on a
clean clone for reasons that have nothing to do with the code.
