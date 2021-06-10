FROM node:alpine

WORKDIR /app
COPY . .
RUN apk add nmap nmap-scripts
RUN npm install
RUN npm run build

CMD ["node", "__sapper__/build"]

EXPOSE 3000