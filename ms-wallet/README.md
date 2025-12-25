# Wallet Microservice

A digital wallet microservice for managing user transactions (CREDIT/DEBIT).

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Language:** TypeScript 5.x
- **Framework:** Fastify
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT
- **Inter-service Communication:** gRPC
- **Documentation:** Swagger/OpenAPI

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT secret for external auth | `ILIACHALLENGE` |
| `JWT_INTERNAL_SECRET` | JWT secret for internal gRPC auth | `ILIACHALLENGE_INTERNAL` |
| `PORT` | HTTP server port | `3001` |
| `GRPC_PORT` | gRPC server port | `50051` |
| `NODE_ENV` | Environment | `development` |

### 3. Database Setup

Run migrations:

```bash
npm run prisma:migrate
```

Generate Prisma client:

```bash
npm run prisma:generate
```

### 4. Run the Application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

## Docker

Build and run with Docker:

```bash
docker build -t ms-wallet .
docker run -p 3001:3001 -p 50051:50051 --env-file .env ms-wallet
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/transactions` | Create a transaction | JWT |
| `GET` | `/transactions` | List transactions | JWT |
| `GET` | `/balance` | Get user balance | JWT |
| `GET` | `/health` | Health check | - |
| `GET` | `/docs` | Swagger documentation | - |

## gRPC Services

The microservice exposes a gRPC server on port 50051 for internal communication:

- `GetBalance` - Get user balance
- `GetTransactions` - Get user transactions
- `CreateTransaction` - Create a transaction
- `DeleteUserTransactions` - Delete all user transactions

## Testing

```bash
npm test
npm run test:coverage
```

## Linting & Formatting

```bash
npm run lint
npm run format
```
