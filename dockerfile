FROM node:22-bookworm-slim

# Prisma cần openssl
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài thư viện trước để tận dụng cache của Docker
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY . .

ENV NODE_ENV=production
EXPOSE 3000
USER node

# Áp dụng migration rồi khởi động app
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]