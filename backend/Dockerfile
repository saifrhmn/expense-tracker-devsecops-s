FROM node:22-alpine

# Update npm to a patched version
RUN npm install -g npm@10.9.9

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 5000

CMD ["node", "src/server.js"]
