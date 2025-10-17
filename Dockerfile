# Etapa de build do frontend
FROM node:18-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN chmod -R 755 .
RUN npm run build

# Etapa de build do backend
FROM node:18-alpine AS build-backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend .

# Final: junta tudo
FROM node:18-alpine
WORKDIR /app
COPY --from=build-frontend /app/frontend/dist ./frontend/dist
COPY --from=build-backend /app/backend .
EXPOSE 3000
CMD ["node", "server.js"]
