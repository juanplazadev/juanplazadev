# syntax=docker/dockerfile:1

# Node 26 to match the host toolchain (v26.8.1).
ARG NODE_VERSION=26

# Dependencies only. Copying just the manifests means editing application code
# reuses this layer instead of re-resolving the whole tree, and the npm cache
# mount keeps a changed lockfile from re-downloading everything.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci

# Dev server. No COPY of the source: compose bind-mounts it so edits hot-reload.
# node_modules is shadowed by an anonymous volume there, which is why the deps
# layer has to bake it in rather than relying on the mount.
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 5180
CMD ["npm", "run", "dev"]

# Production bundle.
FROM deps AS build
# Passed by compose.prod.yaml from the root .env. They have to be set before
# `npm run build`, not at container start: Vite substitutes them into the
# bundle textually, so by runtime there is nothing left to configure.
ARG VITE_WEATHER_LATITUDE
ARG VITE_WEATHER_LONGITUDE
ARG VITE_WEATHER_TIMEZONE
ARG VITE_WEATHER_API_URL
ENV VITE_WEATHER_LATITUDE=$VITE_WEATHER_LATITUDE \
    VITE_WEATHER_LONGITUDE=$VITE_WEATHER_LONGITUDE \
    VITE_WEATHER_TIMEZONE=$VITE_WEATHER_TIMEZONE \
    VITE_WEATHER_API_URL=$VITE_WEATHER_API_URL
COPY . .
RUN npm run build

# Static server. A stand-in until the Spring Boot service exists: at that point
# compose.prod.yaml repoints its build context at ./backend and this stage goes
# away, with the JAR serving the same dist/ from src/main/resources/static.
FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
