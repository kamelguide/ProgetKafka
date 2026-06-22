FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

# Copy the rest of the application files, including public and src
COPY . .

# Expose port
EXPOSE 4000

CMD ["node", "src/index.js"]
