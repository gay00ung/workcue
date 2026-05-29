FROM node:24-alpine

WORKDIR /app

RUN npm install -g pnpm@10.30.3

COPY . .

RUN pnpm install --frozen-lockfile \
  && pnpm build

ENTRYPOINT ["node", "apps/cli/dist/index.js"]
CMD ["today", "--demo"]
