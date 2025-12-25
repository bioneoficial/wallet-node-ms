FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

FROM base AS development

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001 50051

CMD ["npm", "run", "dev"]

FROM base AS builder

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

RUN npx prisma generate

EXPOSE 3001 50051

CMD ["npm", "start"]
