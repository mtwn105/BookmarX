FROM oven/bun:1.3.5-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN bun install

FROM oven/bun:1.3.5-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src
EXPOSE 4000
CMD ["bun", "run", "start"]
