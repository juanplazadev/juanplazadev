Every service I run on this box sits behind one Caddy container. It gets its own
certificates, renews them before they expire, and I have never once run
`certbot` against it. The configuration for a new site is three lines.

## The whole thing

Caddy runs as a container of its own, joined to an external Docker network that
every app container also joins. Nothing but Caddy publishes a host port:

```yaml
services:
    caddy:
        image: caddy:2-alpine
        ports:
            - '80:80'
            - '443:443'
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
    caddy_config:
```

Adding a site to it is one block in the Caddyfile:

```caddyfile
juanplaza.dev {
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=(self)"
        Strict-Transport-Security "max-age=31536000"
    }

    reverse_proxy juanplaza:8080
}
```

That is the entire TLS setup. Because the site name is a real public hostname,
Caddy solves an ACME challenge against Let's Encrypt on first request, writes the
certificate into `/data`, and renews it at roughly two thirds of its lifetime.
`juanplaza:8080` resolves over the `proxy` network by container name, so the app
never needs a published port at all.

## The part that actually matters

**`caddy_data` is not optional.** Certificates and the ACME account key live
there. Leave it out and every `docker compose up --build` throws away the account
and asks Let's Encrypt for a fresh certificate. Do that often enough and you hit
the rate limit - five duplicate certificates per week - and then the site is
simply on HTTP until the window rolls over. A named volume costs nothing and
removes the entire failure mode.

## The two things that go wrong

1. **The external network does not exist yet.** `external: true` means Docker
   will not create it for you; compose fails on the first `up`. Run
   `docker network create proxy` once per machine.
2. **The DNS record is not live.** The HTTP-01 challenge needs Let's Encrypt to
   reach port 80 at that exact name from the public internet. If the record is
   missing, still propagating, or pointed at a proxy that is not passing
   `/.well-known/acme-challenge/` through, issuance fails and Caddy quietly falls
   back to its internal self-signed CA - which is why the browser warning says
   the certificate is untrusted rather than expired.

For local names that will never be publicly resolvable, skip ACME entirely with
`tls internal`. Caddy issues from its own CA, and you trust that CA once on your
machine instead of fighting a challenge that can never succeed.
