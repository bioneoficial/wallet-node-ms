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

### Idempotency

Write operations require the `Idempotency-Key` header:

- `POST /transactions`
- Reusing the same key with the same payload returns the stored response.
- Reusing the same key with a different payload returns `409 Conflict`.
- If the request is already being processed, the API returns `409 Conflict`.

## gRPC Services

The microservice exposes a gRPC server on port 50051 for internal communication:

- `GetBalance` - Get user balance
- `GetTransactions` - Get user transactions
- `CreateTransaction` - Create a transaction
- `DeleteUserTransactions` - Delete all user transactions

### Security (TLS/mTLS)

gRPC communication is secured with mutual TLS (mTLS):
- Server certificate validates the wallet service identity
- Client certificate validates the calling service (ms-users)
- CA certificate ensures trust chain
- JWT tokens in metadata provide additional authentication

**Development:** Self-signed certificates are stored in `/certs`.  
**Production:** Use certificates from a trusted CA and store private keys securely (e.g., Vault, Kubernetes secrets).

### Balance Consistency

The service uses a **cached balance strategy** for performance and consistency:
- Transactions are stored as an append-only event log
- Each transaction creation atomically updates a `Balance` table
- Balance queries read directly from the cached value
- This approach prevents race conditions and improves read performance

## Audit Logging

All transaction operations are automatically logged to the `audit_logs` table:

- **TRANSACTION_CREATED** - When a transaction is created

Each audit log captures:
- User ID
- Action performed
- Resource affected (transactions)
- Metadata (transaction ID, amount, type)
- IP address
- User agent

Audit logs are immutable and indexed by `userId`, `action`, and `createdAt` for compliance and troubleshooting.

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
