# syntax=docker/dockerfile:1

# ---------- Build ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# ---------- Runtime ----------
FROM nginx:1.29-alpine

# O nginx gera a configuração a partir do template, substituindo ${BACKEND_URL}
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/gerenciador-gastos/browser /usr/share/nginx/html

ENV BACKEND_URL=http://api:8080

EXPOSE 80
