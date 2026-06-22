FROM node:18-alpine

RUN apk add --no-gradient --no-cache make gcc g++ python3

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 50053

CMD ["node", "index.js"]
