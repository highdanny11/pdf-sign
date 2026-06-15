FROM oven/bun:1 AS bun-src

FROM pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-ubuntu-20.04-x86_64
LABEL maintainer="pdf-sign"

ENTRYPOINT []

COPY --from=bun-src /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
