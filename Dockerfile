FROM node:24-alpine

WORKDIR /app

RUN npm install -g pnpm@10.30.3

COPY . .

RUN pnpm install --frozen-lockfile

ENTRYPOINT ["pnpm"]
CMD ["demo"]
