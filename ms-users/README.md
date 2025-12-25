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
| `GET` | `/users/:id` | Get user by ID | JWT |
| `PATCH` | `/users/:id` | Update user | JWT |
| `DELETE` | `/users/:id` | Delete user | JWT |

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
