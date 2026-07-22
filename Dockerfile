# ----------------------------
# 1️⃣ Etapa de build
# ----------------------------
FROM node:22-slim AS build

# Instala dependências de rede que o npm pode precisar
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Corrige DNS, aumenta timeouts e reduz sockets simultâneos
# RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf \
#     && npm config set registry https://registry.npmjs.org/ \
#     && npm config set fetch-retries 5 \
#     && npm config set fetch-retry-factor 2 \
#     && npm config set fetch-retry-mintimeout 20000 \
#     && npm config set fetch-retry-maxtimeout 120000 \
#     && npm config set network-timeout 600000 \
#     && npm set maxsockets 5


# Usa npm ci (mais rápido e estável em ambientes CI/CD)
# Instala apenas dependências de produção/dev otimizadas para memória
RUN npm install --no-audit --no-fund

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
# Build do frontend com limite de memória alocada para o Node (ex: 1GB ou 1.5GB)
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

# ----------------------------
# 2️⃣ Etapa de produção (Nginx)
# ----------------------------
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf.template /etc/nginx/nginx.conf.template
CMD ["/bin/sh", "-c", "export API_CONTAINER=${API_CONTAINER:-localhost} API_PORT=${API_PORT:-8080} && envsubst '$API_CONTAINER $API_PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]