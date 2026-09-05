# syntax=docker/dockerfile:1
ARG PHP_VERSION=8.5
ARG NODE_MAJOR=26

# Shared base: install the PHP extensions once so the vendor, frontend and prod
# stages reuse a single layer instead of compiling ICU/zip three times.
# install-php-extensions also leaves curl in place for the runtime healthcheck.
FROM dunglas/frankenphp:php${PHP_VERSION} AS base
RUN install-php-extensions pcntl pdo_pgsql intl zip opcache bcmath
WORKDIR /app

# Node is needed by three stages (the asset build, the runtime JS deps, and the
# runtime itself for Inertia SSR). Installing it once here means the nodesource
# script and its apt fetch run a single time per build instead of three.
FROM base AS node_base
ARG NODE_MAJOR
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Composer dependencies
FROM base AS vendor
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
# package:discover boots the framework, which refuses to run without a key. This
# value never reaches the runtime image; the real one comes from the prod .env.
ENV APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
COPY composer.json composer.lock ./
# Cache mount so a changed composer.lock only re-downloads what actually
# changed, rather than the whole dependency tree.
RUN --mount=type=cache,target=/tmp/composer-cache,sharing=locked \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
# bootstrap/cache is dockerignored (host artifacts must not be baked in), so
# package:discover needs the directory recreated before it can write to it.
RUN mkdir -p bootstrap/cache \
    && composer dump-autoload --optimize --no-dev

# Frontend assets. Needs Node *and* PHP: the Wayfinder Vite plugin shells out to
# artisan to enumerate routes, which is why this builds on node_base and pulls
# vendor/ and bootstrap/cache from the vendor stage.
FROM node_base AS frontend
ENV APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
# Vite inlines VITE_* into the JS bundle at build time; the runtime .env cannot
# change them afterwards. A changed value here is a changed bundle, which is why
# these are build args rather than runtime environment.
ARG VITE_APP_NAME="Juan Plaza"
ARG VITE_WEATHER_LATITUDE=""
ARG VITE_WEATHER_LONGITUDE=""
ARG VITE_WEATHER_TIMEZONE=""
ARG VITE_WEATHER_API_URL=""
ENV VITE_APP_NAME=${VITE_APP_NAME} \
    VITE_WEATHER_LATITUDE=${VITE_WEATHER_LATITUDE} \
    VITE_WEATHER_LONGITUDE=${VITE_WEATHER_LONGITUDE} \
    VITE_WEATHER_TIMEZONE=${VITE_WEATHER_TIMEZONE} \
    VITE_WEATHER_API_URL=${VITE_WEATHER_API_URL}
# Install before copying the source, so editing app code reuses the cached
# install instead of re-running npm ci on every deploy. node_modules is
# dockerignored, so the source copy below cannot clobber it.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci
COPY --from=vendor /app/vendor ./vendor
COPY . .
# The vendor stage's package:discover output, generated without dev packages.
# The wayfinder plugin's artisan call cannot boot without it.
COPY --from=vendor /app/bootstrap/cache ./bootstrap/cache
# Both bundles: public/build for the browser, bootstrap/ssr for the SSR process.
RUN npm run build:ssr

# Production JS deps. Separate from the `frontend` stage so the build tree never
# reaches the runtime image, and so only this layer rebuilds when app code
# changes. Required at runtime: the SSR bundle externalizes its bare imports
# (react, react-dom/server, @inertiajs/react, @radix-ui/*, lucide-react, sonner,
# class-variance-authority), all of which live in `dependencies`.
FROM node_base AS node_deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev

# Runtime - extensions, curl and Node all come from the shared bases, so nothing
# is reinstalled here.
FROM node_base AS prod
# Opcache tuned for long-running Octane workers.
RUN { \
      echo "opcache.enable=1"; \
      echo "opcache.enable_cli=1"; \
      echo "opcache.jit=tracing"; \
      echo "opcache.jit_buffer_size=64M"; \
      echo "opcache.validate_timestamps=0"; \
      echo "opcache.memory_consumption=256"; \
      echo "opcache.max_accelerated_files=20000"; \
    } > /usr/local/etc/php/conf.d/zz-opcache.ini

# Deployed commit SHA, for correlating a running container with a commit.
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

COPY --chown=www-data:www-data . .
COPY --from=vendor --chown=www-data:www-data /app/vendor ./vendor
COPY --from=vendor --chown=www-data:www-data /app/bootstrap/cache ./bootstrap/cache
COPY --from=frontend --chown=www-data:www-data /app/public/build ./public/build
COPY --from=frontend --chown=www-data:www-data /app/bootstrap/ssr ./bootstrap/ssr
COPY --from=node_deps --chown=www-data:www-data /app/node_modules ./node_modules

RUN install -m 0755 docker-entrypoint.sh /usr/local/bin/app-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
        storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    # The base image points XDG_DATA_HOME at /data and XDG_CONFIG_HOME at
    # /config, both root-owned. Octane's Caddy runs as www-data and logs
    # "unable to autosave config" / "could not clean default/global storage"
    # on every boot without these.
    && chown -R www-data:www-data /data /config

# www-data's home is not writable, and the SSR node process wants somewhere to
# put its scratch files.
ENV HOME=/tmp
USER www-data

# 8080, not 80: the server's Caddyfile already reverse-proxies juanplaza.dev to
# juanplaza:8080, and keeping the port means that config needs no edit.
EXPOSE 8080

# Both processes, so a dead SSR child marks the container unhealthy instead of
# quietly serving un-prerendered pages. 127.0.0.1 rather than localhost: the
# latter resolves to ::1 first and these bind IPv4.
#
# The Host header is not optional. bootstrap/app.php pins trustHosts to
# juanplaza.dev, so Symfony rejects a bare loopback curl - Host 127.0.0.1:8080 -
# with a 400 and the container never goes healthy. Keep this value in step with
# that trustHosts list. The SSR curl needs none: 13714 is a plain Node server.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS -H 'Host: juanplaza.dev' http://127.0.0.1:8080/up && curl -fsS http://127.0.0.1:13714/health || exit 1

# Base image ENTRYPOINT (docker-php-entrypoint) execs this.
CMD ["app-entrypoint"]
