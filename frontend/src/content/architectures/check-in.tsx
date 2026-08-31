import { box } from "@/components/ui/diagram/box";
import Diagram from "@/components/ui/diagram/diagram";
import DiagramEdge from "@/components/ui/diagram/diagram-edge";
import DiagramGroup from "@/components/ui/diagram/diagram-group";
import DiagramNode from "@/components/ui/diagram/diagram-node";
import SpecList from "@/components/ui/spec-list";

const browser = box(190, 10, 180, 50);
const caddy = box(190, 128, 180, 54);
const checkin = box(20, 212, 176, 62);
const horizon = box(202, 212, 152, 62);
const scheduler = box(364, 212, 176, 62);
const pgsql = box(40, 316, 190, 52);
const redis = box(310, 316, 190, 52);

// Three containers reach Redis. Spread the arrivals along its top edge so the
// arrowheads do not stack into a blob at one point.
const toRedis = (x: number) => [x, redis.y] as const;

export default function CheckIn() {
  return (
    <>
      <p>
        A scheduling and check-in platform for operations that run on arrivals — drivers book a slot, arrive, and check
        in against it across a number of sites. It is still in development, and what follows is the staging architecture
        rather than a production one — but staging is deployed and reachable, and the demo link above goes to it.
      </p>

      <p>
        The shape of the problem is what drives the shape of the stack. A check-in is a short, latency-sensitive
        request. Everything <em>around</em> it — the confirmation SMS, the PDF, the reminder — is neither, and none of
        it should be able to make an arriving driver wait. So the request path is kept narrow and everything else is
        pushed onto a queue.
      </p>

      <SpecList
        items={[
          { label: "Backend", value: "Laravel 13 · PHP 8.5", icon: "laravel" },
          { label: "App server", value: "Octane on FrankenPHP", icon: "php" },
          { label: "Frontend", value: "Inertia · React 19 · TypeScript", icon: "inertia" },
          { label: "Build", value: "Vite 8 · Tailwind v4", icon: "vite" },
          { label: "Database", value: "PostgreSQL 18", icon: "postgresql" },
          { label: "Cache / queue", value: "Redis, workers via Horizon", icon: "redis" },
          { label: "Monitoring", value: "Sentry", icon: "sentry" },
          { label: "Auth", value: "Fortify, headless · Spatie Permission", icon: "auth" },
          { label: "CI/CD", value: "GitHub Actions, self-hosted runner", icon: "githubActions" },
        ]}
      />

      <Diagram
        title="Check-in staging stack"
        description="A browser reaches Caddy over HTTPS. Caddy proxies only to the checkin container, which runs Laravel on Octane and FrankenPHP. Two sibling containers built from the same image run alongside it: Horizon, which works the queue, and a scheduler running schedule:work. PostgreSQL and Redis sit on a second Docker network alongside them. The checkin container talks to both; Horizon and the scheduler talk to Redis. Only the checkin container joins the network Caddy is on."
        width={560}
        height={400}
        caption="Only the checkin container joins the proxy network. Everything else sits on the backend network, where Caddy has no route to it."
      >
        <DiagramGroup x={10} y={94} w={540} h={298} label="VPS · docker" />
        <DiagramGroup x={24} y={300} w={512} h={84} label="backend network" />

        <DiagramNode box={browser} icon="browser" label="Browser" sublabel="drivers and staff" />
        <DiagramNode box={caddy} icon="caddy" label="Caddy" sublabel="TLS · ACME over DNS" />
        <DiagramNode box={checkin} icon="laravel" variant="accent" label="checkin" sublabel="Octane · FrankenPHP" />
        <DiagramNode box={horizon} icon="laravelHorizon" label="horizon" sublabel="queue workers" />
        <DiagramNode box={scheduler} icon="clock" label="scheduler" sublabel="schedule:work" />
        <DiagramNode box={pgsql} icon="postgresql" label="pgsql" sublabel="PostgreSQL 18" />
        <DiagramNode box={redis} icon="redis" label="redis" sublabel="cache · queue · sessions" />

        <DiagramEdge from={browser.bottom} to={caddy.top} label="HTTPS" />
        <DiagramEdge from={caddy.bottom} to={checkin.top} label="proxy network" />
        <DiagramEdge from={checkin.bottom} to={pgsql.top} />
        <DiagramEdge from={checkin.bottom} to={toRedis(360)} />
        <DiagramEdge from={horizon.bottom} to={toRedis(405)} />
        <DiagramEdge from={scheduler.bottom} to={toRedis(450)} />
      </Diagram>

      <h2>One image, three roles</h2>

      <p>
        The <code>checkin</code>, <code>horizon</code> and <code>scheduler</code> containers are the same image started
        with different commands. That is deliberate: a queued job runs the same code, the same dependencies and the same
        configuration as the request that dispatched it, so a job cannot fail in a way the web process could not
        reproduce. A single build also means a deploy can never leave the workers a version behind the app.
      </p>

      <p>
        The worker container gets a long stop grace period on shutdown. Killing a worker mid-job would leave that job
        half-applied with no record of it; given time, it finishes what it is holding and then exits.
      </p>

      <h2>The request path</h2>

      <p>
        Octane on FrankenPHP keeps the framework booted between requests rather than building the whole application
        container on every one. That is most of the latency difference, and it is why the app server is worth the
        constraint it brings: state that leaks between requests is now a real bug class, so anything held statically has
        to be treated as suspect.
      </p>

      <p>
        Because Octane holds the app in memory, a deploy is not finished when the new container starts — the workers and
        the app both need to be told to pick up the new code. The deploy ends with a reload for exactly that reason.
      </p>

      <p>
        On the way out, Inertia means there is no separate API for the front end to consume: a controller returns a page
        component and its props, and Vite builds the React that receives them. That removes the client/server contract
        entirely, and with it the class of bug where the two drift apart. Wayfinder closes the last gap by generating
        typed helpers from the Laravel routes, so a route renamed in PHP breaks the TypeScript build rather than a page
        in production.
      </p>

      <h2>Auth and per-site scoping</h2>

      <p>
        Fortify handles authentication headlessly — login, registration, email verification, password reset — with the
        UI built as ordinary Inertia and React pages rather than published Blade templates. The benefit is that the auth
        screens are the same React components, with the same design system, as the rest of the app.
      </p>

      <p>
        Authorization is roles and permissions with team support, where a &ldquo;team&rdquo; is a site. Staff are scoped
        to the locations they actually work at, so the same role means different access at different sites rather than
        needing a separate role per site.
      </p>

      <h2>Queues, and where Horizon lives</h2>

      <p>
        SMS delivery, PDF rendering and mail all go on the queue. Horizon supervises the workers and provides the
        dashboard for retries, failures and throughput.
      </p>

      <p>
        That dashboard is <strong>not reachable over the public hostname</strong>. The proxy returns a 404 for it rather
        than a 403 — a 403 confirms the thing exists — and the dashboard is instead reachable only over a private
        network the operators are on. It is a real admin surface over the job queue, so the safest amount of it exposed
        to the internet is none.
      </p>

      <p>
        That is a claim worth holding to, so it is a test rather than a note in a runbook. A feature test asserts the
        dashboard is unreachable the public way, which means a future routing change that quietly exposes it fails CI
        instead of shipping.
      </p>

      <p>
        What the queue cannot tell you is whether the job was <em>right</em>. Sentry catches the exceptions from both
        sides — the request path and the workers — so a job that fails at 3am surfaces with its stack trace instead of
        as a Horizon counter nobody was watching. Structured logs handle the rest.
      </p>

      <h2>The parts that are easy to underestimate</h2>

      <ul>
        <li>
          <strong>SMS and shortlinks.</strong> Confirmations go out by text, and a text is a bad place for a long URL,
          so links are minted through a shortlink service on its own host. It is a small subsystem that turns out to
          need its own routing, its own storage and its own expiry rules.
        </li>
        <li>
          <strong>PDFs.</strong> Rendered by driving a headless Chrome, which means the browser has to be in the image.
          That is most of what makes this build heavier than an ordinary PHP one, and it is why the image is built once
          and pushed rather than rebuilt per environment.
        </li>
        <li>
          <strong>Phone numbers and locales.</strong> Numbers are validated and normalised properly rather than by
          regex. Anything that will later be dialled or texted has to survive being typed in a dozen different formats.
        </li>
      </ul>

      <h2>What is tested, and what that costs</h2>

      <p>
        Sixty-six test files — 41 feature, 20 unit, 5 browser — run on every push and every pull request. The suite is
        Pest, with Playwright driving Chromium for the browser layer, and it gates the same branches the deploy runs
        from. Nothing merges past a red build.
      </p>

      <p>
        The unit tests cover the parts of this domain that are quietly hard and cheap to get wrong: resolving which
        appointment slots a location actually has free, parsing a site&rsquo;s schedule, the distance calculation behind
        geofenced arrival, phone-number formatting, and locale switching. Those are pure functions with nasty edges, so
        they are tested where the edges are, not through the UI. The feature tests cover the flows on top — booking,
        check-in, the confirmation mail and SMS, the PDF, the encrypted licence field, and history queries.
      </p>

      <p>
        Two decisions in the pipeline that were not free. The PHP matrix is a{" "}
        <strong>single leg on 8.5, deliberately</strong> — the app uses 8.5-only syntax, so an 8.3 or 8.4 leg could not
        parse the source, let alone fail meaningfully. And the CI job runs Pest with <strong>Xdebug off</strong>:
        loading it slowed every test down for a number the job does not use. Coverage thresholds are enforced
        separately, by a composer script that turns Xdebug on for exactly that run.
      </p>

      <p>
        Alongside the tests, the same pipeline runs Larastan for static analysis, Pint for style, and Rector for
        automated upgrades — the same three tools that made the Laravel 5 to 11 jump on the earlier platform survivable.
      </p>

      <h2>Deploying</h2>

      <p>
        A push to the staging branch runs on a self-hosted runner on the target box — the same runner this site uses. It
        builds the image, pushes it to GHCR tagged by commit, brings the stack up, migrates, caches the framework
        config, and reloads the app server so Octane and the workers pick up the new code.
      </p>

      <p>
        The reverse-proxy configuration is kept in the repo as a reference copy only. The live one is on the box, and
        the real hostname is deliberately not committed.
      </p>
    </>
  );
}
