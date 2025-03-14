FROM node:20-alpine

COPY package.json package.json 
RUN npm install

COPY main.js .

ENTRYPOINT [ "sh", "-c", "node main.js" ]