FROM node:24-alpine AS build
WORKDIR /workspace
COPY Front-end/package.json Front-end/package-lock.json ./
RUN npm ci
COPY Front-end/ ./

# No VITE_API_BASE_URL is set: the production client calls the same HTTPS
# origin and Caddy routes API paths to Spring Boot.
RUN npm run build

FROM alpine:3.22
RUN apk add --no-cache su-exec \
    && addgroup -S stealthsync \
    && adduser -S stealthsync -G stealthsync
COPY --from=build /workspace/dist /opt/stealthsync-site
COPY deploy/production/frontend/publish-assets.sh /usr/local/bin/publish-assets
RUN chmod 0755 /usr/local/bin/publish-assets
VOLUME ["/srv"]
ENTRYPOINT ["/usr/local/bin/publish-assets"]
