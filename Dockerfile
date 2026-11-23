# syntax=docker/dockerfile:1

# ---------- Build ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# ---------- Runtime ----------
# Variante oficial do nginx que roda com usuário comum (não root) e escuta na porta 8080
FROM nginxinc/nginx-unprivileged:1.30-alpine

# O nginx gera a configuração a partir do template, substituindo ${BACKEND_URL}
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
# Scripts em /docker-entrypoint.d rodam antes do nginx subir; este imprime a versão no log
COPY --chmod=755 docker/99-versao.sh /docker-entrypoint.d/99-versao.sh
COPY --from=build /app/dist/gerenciador-gastos/browser /usr/share/nginx/html

# A Pipeline grava a versão (tag) na imagem: --build-arg VERSAO=X.Y.Z
ARG VERSAO=0.0.0-des
ENV BACKEND_URL=http://gastos-api:8080 \
    VERSAO_APP=$VERSAO

EXPOSE 8080
