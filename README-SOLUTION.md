# ília Code Challenge - NodeJS Solution

A microservices-based financial application implementing a Wallet and Users system with gRPC communication.

## Architecture Overview

```
┌─────────────────┐     HTTP/JWT      ┌─────────────────┐
│                 │◄─────────────────►│                 │
│   MS-Users      │                   │   MS-Wallet     │
│   (Port 3002)   │───────────────────│   (Port 3001)   │
│                 │    gRPC/Internal  │                 │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│    MongoDB      │                   │   PostgreSQL    │
│   (Port 27017)  │                   │   (Port 5432)   │
└─────────────────┘                   └─────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5.x |
| Framework | Fastify |
| ORM | Prisma |
| Databases | PostgreSQL (Wallet), MongoDB (Users) |
| Authentication | JWT |
| Inter-service | gRPC |
| Validation | Zod |
| Logging | Pino |
| Documentation | Swagger/OpenAPI |
| Testing | Jest |
| Containerization | Docker & Docker Compose |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- **MS-Wallet:** http://localhost:3001
- **MS-Wallet Docs:** http://localhost:3001/docs
- **MS-Users:** http://localhost:3002
- **MS-Users Docs:** http://localhost:3002/docs

### Manual Setup

#### 1. MS-Wallet

```bash
cd ms-wallet
npm install
cp .env.example .env
# Configure DATABASE_URL in .env
npm run prisma:migrate
npm run dev
```

#### 2. MS-Users

```bash
cd ms-users
npm install
cp .env.example .env
# Configure DATABASE_URL and WALLET_GRPC_URL in .env
npm run prisma:migrate
npm run dev
```

## API Documentation

### MS-Wallet (Port 3001)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/transactions` | Create transaction | JWT |
| GET | `/transactions?type=` | List transactions | JWT |
| GET | `/balance` | Get user balance | JWT |
| GET | `/health` | Health check | - |

### MS-Users (Port 3002)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/users` | Create user | - |
| GET | `/users` | List users | JWT |
| GET | `/users/:id` | Get user | JWT |
| PATCH | `/users/:id` | Update user | JWT |
| DELETE | `/users/:id` | Delete user | JWT |
| POST | `/auth` | Authenticate | - |
| GET | `/health` | Health check | - |

## Environment Variables

### Common

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT secret for external auth (ILIACHALLENGE) | Yes |
| `JWT_INTERNAL_SECRET` | JWT secret for gRPC auth (ILIACHALLENGE_INTERNAL) | Yes |
| `NODE_ENV` | Environment (development/production) | No |

### MS-Wallet

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | HTTP server port | 3001 |
| `GRPC_PORT` | gRPC server port | 50051 |

### MS-Users

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB connection string | - |
| `PORT` | HTTP server port | 3002 |
| `WALLET_GRPC_URL` | Wallet gRPC URL | localhost:50051 |

## Project Structure

```
.
├── docker-compose.yml          # Multi-container setup
├── proto/
│   └── wallet.proto            # gRPC service definition
├── ms-wallet/
│   ├── src/
│   │   ├── application/        # Use cases
│   │   ├── domain/             # Entities, repository interfaces
│   │   ├── infrastructure/     # Database, gRPC, HTTP
│   │   ├── presentation/       # Controllers, routes, middlewares
│   │   ├── config/             # Environment configuration
│   │   ├── app.ts              # Fastify app setup
│   │   └── server.ts           # Entry point
│   ├── prisma/                 # Database schema
│   ├── tests/                  # Unit and integration tests
│   ├── Dockerfile
│   └── README.md
└── ms-users/
    └── (same structure)
```

## Testing

```bash
# MS-Wallet
cd ms-wallet
npm test
npm run test:coverage

# MS-Users
cd ms-users
npm test
npm run test:coverage
```

## Gitflow

This project follows Gitflow with feature branches:

1. Create feature branch: `git checkout -b feature/feature-name`
2. Develop and commit
3. Open Pull Request to `main`
4. Code Review
5. Merge

## Security

- **External Auth:** JWT with secret `ILIACHALLENGE`
- **Internal Auth:** JWT with secret `ILIACHALLENGE_INTERNAL` for gRPC
- **Rate Limiting:** 1000 requests per minute
- **Passwords:** Hashed with bcrypt (10 rounds)
- **Security Headers:** Helmet middleware

## Author

Solution for ília Digital Code Challenge
