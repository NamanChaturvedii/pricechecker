# Hosted (server) deployment. Same app; the browser runs headful inside a virtual display (xvfb),
# because the grocery sites block headless browsers. Updates = redeploy the container.
FROM mcr.microsoft.com/playwright:v1.64.0-noble

WORKDIR /srv/app
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/ ./
COPY extensions/ /srv/extensions/
RUN npm run build

ENV NODE_ENV=production \
    PORT=3939 \
    PRICE_CHECKER_DATA=/data \
    PRICE_CHECKER_NO_UPDATE=1 \
    TZ=Asia/Kolkata
VOLUME /data
EXPOSE 3939
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1366x900x24", "node", "scripts/launcher.mjs"]
