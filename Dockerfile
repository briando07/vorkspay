
FROM node:18-alpine AS build-frontend
WORKDIR /app/frontend
COPY ./frontend/package*.json ./
RUN npm install
COPY ./frontend .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY ./backend/package*.json ./
RUN npm install --production
COPY ./backend .
RUN mkdir -p ./public
COPY --from=build-frontend /app/frontend/dist ./public
ENV NODE_ENV=production
ENV PORT=3333
EXPOSE 3333
CMD ["node","src/server.js"]
