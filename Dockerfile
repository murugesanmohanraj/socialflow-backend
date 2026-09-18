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

ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV DISPLAY=:99

EXPOSE 10000

CMD ["bash", "-c", "Xvfb :99 -screen 0 1920x1080x24 -ac > /tmp/xvfb.log 2>&1 & XVFB_PID=$!; sleep 3; echo '=== Xvfb ==='; ps -p $XVFB_PID -f; echo '=== Xvfb log ==='; cat /tmp/xvfb.log; echo '=== Display ==='; export DISPLAY=:99; echo $DISPLAY; xdpyinfo -display :99 >/dev/null 2>&1 && echo 'X server is working' || echo 'X server FAILED'; echo '=== Starting Node ==='; node dist/server.js"]
