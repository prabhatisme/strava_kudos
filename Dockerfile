# https://pptr.dev/troubleshooting
FROM alpine:3.19

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      npm \
      yarn

WORKDIR /app

COPY . .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# alpine:3.19 installs 'Chromium 124.0.6367.78 Alpine Linux'
# -> Puppeteer v22.8.2 (https://pptr.dev/supported-browsers)
# 13.5 because of performance!?
# RUN yarn add puppeteer@22.8.2
RUN yarn add puppeteer@13.5.0 

RUN npm install

ENTRYPOINT [ "sh", "-c", "node main.js -strava_cookie ${COOKIE}" ]