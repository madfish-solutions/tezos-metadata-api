FROM node:18-alpine

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
EXPOSE 3000

CMD [ "node", "--experimental-fetch", "src/index.js" ]
