FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

FROM oven/bun:1.3
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    fontconfig \
    fonts-hosny-amiri \
    libreoffice-writer \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["bun", "dist/server/index.js"]
