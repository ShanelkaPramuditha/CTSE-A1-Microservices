# ============================================
# Payment Service - Dockerfile
# ============================================
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY nest-cli.json ./

RUN pnpm install --frozen-lockfile

COPY libs/ ./libs/
COPY apps/payment-service/ ./apps/payment-service/

RUN npx nest build payment-service

# --- Production stage ---
FROM --platform=$TARGETPLATFORM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 4004

CMD ["node", "dist/apps/payment-service/src/main.js"]
