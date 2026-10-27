# syntax=docker/dockerfile:1.7

# === Stage 1: Build the workspace apps ===
FROM node:26.4.0-trixie AS builder
WORKDIR /app

# Copy root configurations and lockfiles
COPY package.json package-lock.json tsconfig.base.json tsconfig.json nx.json ./

# Copy application and library source files required by the backend build
COPY apps/backend ./apps/backend
COPY packages/api-contracts ./packages/api-contracts
COPY packages/local-runtime-config ./packages/local-runtime-config

# Install all development and production dependencies
RUN npm ci

# Use Nx to build both the api-contracts and the backend
RUN npx nx run backend:build

# === Stage 2: Production runtime ===
FROM node:26.4.0-trixie AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Doppler CLI into the production image
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gpgv \
    && curl -fsSL --tlsv1.2 --proto "=https" --retry 3 \
        https://cli.doppler.com/install.sh \
        -o /tmp/install-doppler.sh \
    && sh /tmp/install-doppler.sh --install-path /usr/local/bin \
    && /usr/local/bin/doppler --version \
    && rm -f /tmp/install-doppler.sh \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests needed for npm workspace production install
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/api-contracts/package.json ./packages/api-contracts/package.json
COPY packages/local-runtime-config/package.json ./packages/local-runtime-config/package.json

# Copy only production dependencies to save space
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev

# Copy the compiled shared workspace library
COPY --from=builder /app/packages/api-contracts/dist ./packages/api-contracts/dist
COPY --from=builder /app/packages/api-contracts/package.json ./packages/api-contracts/package.json

# Copy both entrypoints, their shared chunks, and the compiled migration files
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3001
CMD ["node", "apps/backend/dist/startup.mjs"]
