// Starter post - real, but written to be replaced. It documents the Caddy
// container that already fronts this site (see the repo README) so the blog
// ships with something true rather than lorem ipsum.
export default function Post() {
  return (
    <>
      <p>
        Every service I run on this box sits behind one Caddy container. It gets its own certificates, renews them
        before they expire, and I have never once run <code>certbot</code> against it. The configuration for a new site
        is three lines.
      </p>

      <h2>The whole thing</h2>

      <p>
        Caddy runs as a container of its own, joined to an external Docker network that every app container also joins.
        Nothing but Caddy publishes a host port:
      </p>

      <pre>
        <code>{`services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks: [proxy]
    restart: unless-stopped

networks:
  proxy:
    external: true

volumes:
  caddy_data:
  caddy_config:`}</code>
      </pre>

      <p>Adding a site to it is one block in the Caddyfile:</p>

      <pre>
        <code>{`juanplaza.dev {
    reverse_proxy juanplaza:8080
}`}</code>
      </pre>

      <p>
        That is the entire TLS setup. Because the site name is a real public hostname, Caddy solves an ACME challenge
        against Let's Encrypt on first request, writes the certificate into <code>/data</code>, and renews it at roughly
        two thirds of its lifetime. <code>juanplaza:8080</code> resolves over the <code>proxy</code> network by
        container name, so the app never needs a published port at all.
      </p>

      <h2>The part that actually matters</h2>

      <p>
        <strong>
          <code>caddy_data</code> is not optional.
        </strong>{" "}
        Certificates and the ACME account key live there. Leave it out and every <code>docker compose up --build</code>{" "}
        throws away the account and asks Let's Encrypt for a fresh certificate. Do that often enough and you hit the
        rate limit - five duplicate certificates per week - and then the site is simply on HTTP until the window rolls
        over. A named volume costs nothing and removes the entire failure mode.
      </p>

      <h2>The two things that go wrong</h2>

      <ol>
        <li>
          <strong>The external network does not exist yet.</strong> <code>external: true</code> means Docker will not
          create it for you; compose fails on the first <code>up</code>. Run <code>docker network create proxy</code>{" "}
          once per machine.
        </li>
        <li>
          <strong>The DNS record is not live.</strong> The HTTP-01 challenge needs Let's Encrypt to reach port 80 at
          that exact name from the public internet. If the record is missing, still propagating, or pointed at a proxy
          that is not passing <code>/.well-known/acme-challenge/</code> through, issuance fails and Caddy quietly falls
          back to its internal self-signed CA - which is why the browser warning says the certificate is untrusted
          rather than expired.
        </li>
      </ol>

      <p>
        For local names that will never be publicly resolvable, skip ACME entirely with <code>tls internal</code>. Caddy
        issues from its own CA, and you trust that CA once on your machine instead of fighting a challenge that can
        never succeed.
      </p>
    </>
  );
}
