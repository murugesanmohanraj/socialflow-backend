FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

RUN npx playwright install --with-deps chromium

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    xvfb \
    xauth \
    fluxbox \
    x11vnc \
    x11-utils \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm run build

COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV DISPLAY=:99

EXPOSE 10000

CMD ["/app/docker-entrypoint.sh"]
