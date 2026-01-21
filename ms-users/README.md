# Users Microservice

A microservice for managing users and authentication with integration to Wallet microservice via gRPC.

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Language:** TypeScript 5.x
- **Framework:** Fastify
- **Database:** MongoDB with Prisma ORM
- **Authentication:** JWT (bcrypt for password hashing)
- **Inter-service Communication:** gRPC client
- **Documentation:** Swagger/OpenAPI

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB (or use Docker)
- Wallet Microservice running (for gRPC integration)

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
| `DATABASE_URL` | MongoDB connection string | - |
| `JWT_SECRET` | JWT secret for external auth | `ILIACHALLENGE` |
| `JWT_INTERNAL_SECRET` | JWT secret for internal gRPC auth | `ILIACHALLENGE_INTERNAL` |
| `PORT` | HTTP server port | `3002` |
| `WALLET_GRPC_URL` | Wallet microservice gRPC URL | `localhost:50051` |
| `NODE_ENV` | Environment | `development` |

### 3. Database Setup

Push schema to MongoDB:

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
docker build -t ms-users .
docker run -p 3002:3002 --env-file .env ms-users
```

## API Endpoints

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/users` | Create a user | - |
| `GET` | `/users` | List all users | JWT |
| `GET` | `/users/me` | Get authenticated user profile | JWT |
| `PATCH` | `/users/me` | Update authenticated user profile | JWT |
| `DELETE` | `/users/me` | Delete authenticated user profile | JWT |

### Idempotency

Write operations require the `Idempotency-Key` header:

- `POST /users`
- `PATCH /users/me`
- `DELETE /users/me`

Reusing the same key with the same payload returns the stored response.  
Reusing the same key with a different payload returns `409 Conflict`.  
If the request is already being processed, the API returns `409 Conflict`.

## Audit Logging

All critical operations are automatically logged to the `audit_logs` collection:

- **USER_CREATED** - When a new user registers
- **USER_UPDATED** - When a user updates their profile
- **USER_DELETED** - When a user deletes their account

Each audit log captures:
- User ID
- Action performed
- Resource affected
- Metadata (contextual information)
- IP address
- User agent

Audit logs are immutable and indexed by `userId`, `action`, and `createdAt` for efficient querying.

## Role-Based Access Control (RBAC)

The service implements role-based authorization with two roles:

- **USER** (default) - Standard user with access to their own resources
- **ADMIN** - Administrative user with elevated permissions

### Protected Endpoints

- `GET /users` - **Admin only**. Lists all users in the system.

All other endpoints are restricted to the authenticated user's own resources (enforced via JWT `sub` claim).

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth` | Authenticate user | - |

### Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/health` | Health check | - |
| `GET` | `/docs` | Swagger documentation | - |

## gRPC Integration

When a user is deleted, this microservice calls the Wallet microservice via gRPC to delete all associated transactions.

The gRPC client:
- Sends an internal JWT in metadata (`Authorization: Bearer <token>`).
- Applies resiliency with deadline (2s), retries (2 attempts, exponential backoff), and a circuit breaker (opens after 5 failures, resets after 10s).

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
