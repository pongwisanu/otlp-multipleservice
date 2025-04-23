FROM node:23-alpine

RUN apk --no-cache add curl

WORKDIR /app

COPY package.json .

RUN npm install 

COPY . .

CMD ["node", "index.js"]