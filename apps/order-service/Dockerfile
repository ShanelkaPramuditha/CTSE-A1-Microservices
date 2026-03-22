# ============================================
# Order Service - Dockerfile
# ============================================
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY nest-cli.json ./

RUN pnpm install --frozen-lockfile

COPY libs/ ./libs/
COPY apps/order-service/ ./apps/order-service/

RUN npx nest build order-service

# --- Production stage ---
FROM --platform=$TARGETPLATFORM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 4003

CMD ["node", "dist/apps/order-service/src/main.js"]
