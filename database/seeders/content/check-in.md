A scheduling and check-in platform for operations that run on arrivals - drivers
book a slot, arrive, and check in against it across a number of sites. It is
still in development, and what follows is the staging architecture rather than a
production one - but staging is deployed and reachable, and the demo link above
goes to it.

The shape of the problem is what drives the shape of the stack. A check-in is a
short, latency-sensitive request. Everything _around_ it - the confirmation SMS,
the PDF, the reminder - is neither, and none of it should be able to make an
arriving driver wait. So the request path is kept narrow and everything else is
pushed onto a queue.

::block{key="stack"}

::block{key="staging-stack"}

## One image, three roles

The `checkin`, `horizon` and `scheduler` containers are the same image started
with different commands. That is deliberate: a queued job runs the same code, the
same dependencies and the same configuration as the request that dispatched it,
so a job cannot fail in a way the web process could not reproduce. A single build
also means a deploy can never leave the workers a version behind the app.

The worker container gets a long stop grace period on shutdown. Killing a worker
mid-job would leave that job half-applied with no record of it; given time, it
finishes what it is holding and then exits.

## The request path

Octane on FrankenPHP keeps the framework booted between requests rather than
building the whole application container on every one. That is most of the
latency difference, and it is why the app server is worth the constraint it
brings: state that leaks between requests is now a real bug class, so anything
held statically has to be treated as suspect.

Because Octane holds the app in memory, a deploy is not finished when the new
container starts - the workers and the app both need to be told to pick up the
new code. The deploy ends with a reload for exactly that reason.

On the way out, Inertia means there is no separate API for the front end to
consume: a controller returns a page component and its props, and Vite builds the
React that receives them. That removes the client/server contract entirely, and
with it the class of bug where the two drift apart. Wayfinder closes the last gap
by generating typed helpers from the Laravel routes, so a route renamed in PHP
breaks the TypeScript build rather than a page in production.

## Auth and per-site scoping

Fortify handles authentication headlessly - login, registration, email
verification, password reset - with the UI built as ordinary Inertia and React
pages rather than published Blade templates. The benefit is that the auth screens
are the same React components, with the same design system, as the rest of the
app.

Authorization is roles and permissions with team support, where a "team" is a
site. Staff are scoped to the locations they actually work at, so the same role
means different access at different sites rather than needing a separate role per
site.

## Queues, and where Horizon lives

SMS delivery, PDF rendering and mail all go on the queue. Horizon supervises the
workers and provides the dashboard for retries, failures and throughput.

That dashboard is **not reachable over the public hostname**. The proxy returns a
404 for it rather than a 403 - a 403 confirms the thing exists - and the
dashboard is instead reachable only over a private network the operators are on.
It is a real admin surface over the job queue, so the safest amount of it exposed
to the internet is none.

That is a claim worth holding to, so it is a test rather than a note in a runbook.
A feature test asserts the dashboard is unreachable the public way, which means a
future routing change that quietly exposes it fails CI instead of shipping.

What the queue cannot tell you is whether the job was _right_. Sentry catches the
exceptions from both sides - the request path and the workers - so a job that
fails at 3am surfaces with its stack trace instead of as a Horizon counter nobody
was watching. Structured logs handle the rest.

## The parts that are easy to underestimate

- **SMS and shortlinks.** Confirmations go out by text, and a text is a bad place
  for a long URL, so links are minted through a shortlink service on its own
  host. It is a small subsystem that turns out to need its own routing, its own
  storage and its own expiry rules.
- **PDFs.** Rendered by driving a headless Chrome, which means the browser has to
  be in the image. That is most of what makes this build heavier than an ordinary
  PHP one, and it is why the image is built once and pushed rather than rebuilt
  per environment.
- **Phone numbers and locales.** Numbers are validated and normalised properly
  rather than by regex. Anything that will later be dialled or texted has to
  survive being typed in a dozen different formats.

## What is tested, and what that costs

Sixty-six test files - 41 feature, 20 unit, 5 browser - run on every push and
every pull request. The suite is Pest, with Playwright driving Chromium for the
browser layer, and it gates the same branches the deploy runs from. Nothing
merges past a red build.

The unit tests cover the parts of this domain that are quietly hard and cheap to
get wrong: resolving which appointment slots a location actually has free,
parsing a site's schedule, the distance calculation behind geofenced arrival,
phone-number formatting, and locale switching. Those are pure functions with
nasty edges, so they are tested where the edges are, not through the UI. The
feature tests cover the flows on top - booking, check-in, the confirmation mail
and SMS, the PDF, the encrypted licence field, and history queries.

Two decisions in the pipeline that were not free. The PHP matrix is a **single
leg on 8.5, deliberately** - the app uses 8.5-only syntax, so an 8.3 or 8.4 leg
could not parse the source, let alone fail meaningfully. And the CI job runs Pest
with **Xdebug off**: loading it slowed every test down for a number the job does
not use. Coverage thresholds are enforced separately, by a composer script that
turns Xdebug on for exactly that run.

Alongside the tests, the same pipeline runs Larastan for static analysis, Pint for
style, and Rector for automated upgrades - the same three tools that made the
Laravel 5 to 11 jump on the earlier platform survivable.

## Deploying

A push to the staging branch runs on a self-hosted runner on the target box - the
same runner this site uses. It builds the image, pushes it to GHCR tagged by
commit, brings the stack up, migrates, caches the framework config, and reloads
the app server so Octane and the workers pick up the new code.

The reverse-proxy configuration is kept in the repo as a reference copy only. The
live one is on the box, and the real hostname is deliberately not committed.
