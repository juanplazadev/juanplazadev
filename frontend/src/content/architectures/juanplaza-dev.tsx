import { box } from "@/components/ui/diagram/box";
import Diagram from "@/components/ui/diagram/diagram";
import DiagramEdge from "@/components/ui/diagram/diagram-edge";
import DiagramGroup from "@/components/ui/diagram/diagram-group";
import DiagramNode from "@/components/ui/diagram/diagram-node";
import SpecList from "@/components/ui/spec-list";

// Request path. Authored at 560 wide so the text lands near its rendered size in
// the 728px sheet.
const browser = box(30, 12, 180, 52);
const meteo = box(350, 12, 180, 52);
const caddy = box(30, 136, 180, 60);
const app = box(30, 240, 180, 70);
const planned = box(350, 240, 180, 70);

// Deploy path.
const push = box(7, 16, 108, 78);
const runner = box(153, 16, 108, 78);
const registry = box(299, 16, 108, 78);
const up = box(445, 16, 108, 78);

export default function JuanplazaDev() {
  return (
    <>
      <p>
        A React single-page app with no backend, which makes the interesting part the boundary around it rather than
        anything inside it: how it is served, how it is built, and what happens on a deploy.
      </p>

      <SpecList
        items={[
          { label: "Frontend", value: "React 19 · TypeScript · React Router", icon: "react" },
          { label: "Build", value: "Vite · Tailwind v4 (CSS-first)", icon: "vite" },
          { label: "Served by", value: "nginx, one container", icon: "nginx" },
          { label: "Edge", value: "Caddy, automatic TLS", icon: "caddy" },
          { label: "Registry", value: "GHCR, tagged by commit", icon: "github" },
          { label: "CI/CD", value: "GitHub Actions, self-hosted runner", icon: "githubActions" },
        ]}
      />

      <Diagram
        title="Request path for juanplaza.dev"
        description="A browser requests the site over HTTPS. Caddy terminates TLS and reverse-proxies to the juanplaza container on port 8080 over a shared Docker network. That container is nginx serving the built Vite bundle. Separately, the browser calls the Open-Meteo forecast API directly, without passing through the server. A planned Spring Boot container will replace the nginx one, serving both the API and the app from a single JAR."
        width={560}
        height={340}
        caption="One container, reached by name. The only other network call leaves the browser and never touches the box."
      >
        <DiagramGroup x={14} y={100} w={532} h={228} label="VPS · docker" labelAnchor="end" />

        <DiagramNode box={browser} icon="browser" label="Browser" sublabel="juanplaza.dev" />
        <DiagramNode box={meteo} icon="weather" label="Open-Meteo" sublabel="forecast API" />
        <DiagramNode box={caddy} icon="caddy" label="Caddy" sublabel="TLS · ACME over DNS" />
        <DiagramNode box={app} icon="nginx" variant="accent" label="app container" sublabel="nginx → dist/ · :8080" />
        <DiagramNode
          box={planned}
          icon="springBoot"
          variant="planned"
          label="Spring Boot"
          sublabel="one JAR · /api + SPA"
        />

        <DiagramEdge from={browser.right} to={meteo.left} variant="dashed" label="keyless · CORS-open" />
        <DiagramEdge from={browser.bottom} to={caddy.top} label="HTTPS" />
        <DiagramEdge from={caddy.bottom} to={app.top} label="proxy network · :8080" />
        <DiagramEdge from={app.right} to={planned.left} variant="dashed" label="becomes" />
      </Diagram>

      <h2>The edge</h2>

      <p>
        Caddy runs in its own project and fronts every container on the box. It gets a certificate over the ACME DNS
        challenge, which means it never needs port 80 reachable and can issue for hosts that are not publicly
        resolvable. Renewal is automatic and unattended; there is no cron job and nothing to remember.
      </p>

      <p>
        The site&rsquo;s container publishes <strong>no host ports at all</strong>. It joins a shared Docker network
        that Caddy is also on, and Caddy reaches it by service name:
      </p>

      <pre>
        <code>{`reverse_proxy juanplaza:8080`}</code>
      </pre>

      <p>
        That is worth more than it looks. A port that is never bound cannot collide with another project on the same
        box, cannot be reached around the proxy, and cannot accidentally be exposed by a firewall rule someone changes
        later. The container is unreachable except through Caddy, by construction rather than by policy.
      </p>

      <h2>No database</h2>

      <p>
        There is no API and no CMS. Blog posts are TypeScript modules — a registry of metadata plus a lazy import per
        post — so each body is code-split and prose never lands in the main bundle. Publishing is a commit, and the
        content is typechecked along with everything else.
      </p>

      <p>
        The single live request the app makes is to Open-Meteo for the conditions in the hero&rsquo;s location pill.
        That API is keyless and CORS-open, so it goes straight from the browser rather than through a proxy — which is
        why it sits outside the box in the diagram above. If the coordinates are blank or the request fails, the pill
        falls back to a plain location label. It never renders an error.
      </p>

      <h2>Deploying</h2>

      <Diagram
        title="Deploy pipeline"
        description="A push to the production branch triggers a workflow on a self-hosted runner on the VPS. It builds the image, pushes it to GHCR tagged with both the commit SHA and latest, then brings the stack up and polls the container healthcheck."
        width={560}
        height={120}
        minWidth={480}
        caption="The runner is on the same machine it deploys to, so nothing is copied over the network at deploy time."
      >
        <DiagramNode box={push} icon="git" iconPlacement="top" label="push" sublabel="→ production" />
        <DiagramNode box={runner} icon="githubActions" iconPlacement="top" label="runner" sublabel="on the VPS" />
        <DiagramNode box={registry} icon="github" iconPlacement="top" label="GHCR" sublabel="sha + latest" />
        <DiagramNode box={up} icon="docker" iconPlacement="top" variant="accent" label="up -d" sublabel="healthcheck" />

        <DiagramEdge from={push.right} to={runner.left} />
        <DiagramEdge from={runner.right} to={registry.left} />
        <DiagramEdge from={registry.right} to={up.left} />
      </Diagram>

      <p>
        A separate workflow gates both <code>main</code> and the production branch on lint, formatting and the build —
        and the build script is <code>tsc -b &amp;&amp; vite build</code>, so a type error fails CI too. CI runs the
        non-mutating twins of the lint and format scripts on purpose: the <code>--fix</code> and <code>--write</code>{" "}
        versions would let a dirty tree pass by quietly rewriting it.
      </p>

      <p>Three decisions in here took a second pass to get right.</p>

      <ul>
        <li>
          <strong>Config crosses as build args, not environment.</strong> Vite inlines <code>VITE_*</code> into the
          bundle at build time, so a changed value is a changed bundle. Passing them as runtime environment would look
          like it worked and silently do nothing — the deployed JavaScript already has the old value baked in. Changing
          one means a rebuild, not a restart.
        </li>
        <li>
          <strong>
            The healthcheck hits <code>127.0.0.1</code>, not <code>localhost</code>.
          </strong>{" "}
          On this image <code>localhost</code> resolves to <code>::1</code> first and nginx binds IPv4-only, so the
          check hit a closed IPv6 socket and the container sat permanently unhealthy while serving traffic perfectly
          well.
        </li>
        <li>
          <strong>Rollback re-points, it does not rebuild.</strong> Every image is tagged with its commit SHA, so going
          back is starting an image that already exists and has already been tested — not rebuilding an old commit on a
          toolchain that has moved since.
        </li>
      </ul>

      <h2>What changes next</h2>

      <p>
        The planned Spring Boot backend serves the JSON API <em>and</em> the built SPA from the same JAR, so there is
        one container, one origin and no CORS. Gradle runs the frontend build and copies the output into the JAR&rsquo;s
        static resources.
      </p>

      <p>
        The production compose file then repoints a single build context and nothing else moves: same service name, same
        container name, same port, same network, same healthcheck path — so the Caddy config never changes. The one
        thing that does need writing is a handler forwarding non-API misses to <code>index.html</code>, which is what
        nginx&rsquo;s <code>try_files</code> is standing in for today. Without it every route but <code>/</code> would
        404 on a hard refresh.
      </p>
    </>
  );
}
