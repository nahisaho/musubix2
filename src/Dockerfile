# MUSUBIX2 Development Container
FROM node:22-slim AS base

WORKDIR /app

# Install dependencies only
COPY src/package.json src/package-lock.json ./
COPY src/packages/*/package.json ./packages-tmp/
RUN cd /app && \
    for f in packages-tmp/*/package.json; do \
      dir="packages/$(basename $(dirname $f))"; \
      mkdir -p "$dir"; \
      mv "$f" "$dir/"; \
    done && \
    rm -rf packages-tmp && \
    npm ci

# Copy source
COPY src/ .

# Build
RUN npx tsc -b

# ---
FROM node:22-slim AS runtime
WORKDIR /app
COPY --from=base /app /app

ENTRYPOINT ["node"]
CMD ["packages/core/dist/index.js"]
