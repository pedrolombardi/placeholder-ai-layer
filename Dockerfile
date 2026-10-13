FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
ENV PORT=3001
ENV DB_LAYER_URL=http://db-layer:3002
USER node
EXPOSE 3001
CMD ["node", "src/server.js"]
