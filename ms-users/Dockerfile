FROM node:20-slim AS base

RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

FROM base AS development

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3002

CMD ["npm", "run", "dev"]

FROM base AS builder

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

RUN npx prisma generate

EXPOSE 3002

CMD ["npm", "start"]
