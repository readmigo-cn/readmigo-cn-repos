FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server-cn/package.json ./server-cn/
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/server-cn
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY --from=build /app/server-cn/dist ./dist
COPY --from=build /app/server-cn/package.json ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
