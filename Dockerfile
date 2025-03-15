FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY main.js .

CMD ["node", "main.js"]