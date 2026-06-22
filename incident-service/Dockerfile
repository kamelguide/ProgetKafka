FROM node:18-alpine

# Install build dependencies (sometimes needed for sqlite3 compilation)
RUN apk add --no-gradient --no-cache make gcc g++ python3

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 50051

CMD ["node", "index.js"]
