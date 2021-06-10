FROM node:alpine

RUN apk add nmap nmap-scripts
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY ./* ./
RUN npm run build

CMD ["node", "__sapper__/build"]

EXPOSE 3000