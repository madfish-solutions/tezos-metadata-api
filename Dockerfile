FROM node:22.23.4-alpine3.24

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
EXPOSE 3000

CMD [ "node", "src/index.js" ]
