FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY nest-cli.json ./

RUN pnpm install --frozen-lockfile

COPY libs/ ./libs/
COPY apps/cart-service/ ./apps/cart-service/

RUN npx nest build cart-service

# --- Production stage ---
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY .env ./

EXPOSE 4005

CMD ["node", "dist/apps/cart-service/main.js"]
