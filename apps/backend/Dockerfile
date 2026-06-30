# syntax=docker/dockerfile:1.7

# === Stage 1: Build the workspace apps ===
FROM node:26.4.0-trixie AS builder
WORKDIR /app

# Copy root configurations and lockfiles
COPY package.json package-lock.json tsconfig.base.json tsconfig.json nx.json ./

# Copy application and library source files required by the backend build
COPY apps/backend ./apps/backend
COPY packages/api-contracts ./packages/api-contracts
COPY .env ./.env

# Keep the requested local dotenvx file in the image without the production private key.
RUN --mount=type=bind,source=.env.keys,target=/tmp/.env.keys,readonly \
    sed '/^DOTENV_PRIVATE_KEY_PRODUCTION/d' /tmp/.env.keys > .env.keys

# Install all development and production dependencies
RUN npm ci

# Use Nx to build both the api-contracts and the backend
RUN npx nx run backend:build-deps
RUN npx nx run backend:build

# === Stage 2: Production runtime ===
FROM node:26.4.0-trixie AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package manifests needed for npm workspace production install
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/api-contracts/package.json ./packages/api-contracts/package.json

# Copy only production dependencies to save space
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev

# Copy local dotenvx configuration for this first-pass local/dev image
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/.env.keys ./.env.keys

# Copy the compiled shared workspace library
COPY --from=builder /app/packages/api-contracts/dist ./packages/api-contracts/dist
COPY --from=builder /app/packages/api-contracts/package.json ./packages/api-contracts/package.json

# Copy the compiled backend application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3001
CMD ["node", "apps/backend/dist/src/app.mjs"]
