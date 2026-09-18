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
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm run build

ENV PLAYWRIGHT_BROWSERS_PATH=0

EXPOSE 10000

CMD ["bash", "-c", "xvfb-run -a --server-args='-screen 0 1920x1080x24' node dist/server.js"]