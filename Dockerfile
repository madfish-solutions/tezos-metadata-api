FROM node:20-alpine3.18

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
EXPOSE 3000

CMD [ "node", "src/index.js" ]
