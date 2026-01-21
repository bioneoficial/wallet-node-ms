import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/infrastructure/database/prisma.js';
import { env } from '../../src/config/env.js';

describe('E2E: Transaction Flow', () => {
  let app: FastifyInstance;
  let authToken: string;
  const testUserId = 'e2e-test-user-123';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test JWT token for the user
    authToken = app.jwt.sign(
      { sub: testUserId, email: 'e2e@example.com', role: 'USER' },
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup: delete test transactions and balance
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.balance.deleteMany({ where: { userId: testUserId } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('Transaction Creation', () => {
    it('should create a credit transaction', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': `e2e-credit-${Date.now()}`,
        },
        payload: {
          amount: 100.50,
          type: 'CREDIT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body.user_id).toBe(testUserId);
      expect(body.amount).toBe(100.50);
      expect(body.type).toBe('CREDIT');
    });

    it('should create a debit transaction', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': `e2e-debit-${Date.now()}`,
        },
        payload: {
          amount: 25.00,
          type: 'DEBIT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.amount).toBe(25.00);
      expect(body.type).toBe('DEBIT');
    });

    it('should reject transaction with invalid amount', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': `e2e-invalid-${Date.now()}`,
        },
        payload: {
          amount: -10,
          type: 'CREDIT',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should fail without idempotency key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          amount: 50.00,
          type: 'CREDIT',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Balance Calculation', () => {
    it('should return correct balance after multiple transactions', async () => {
      // Create credit transaction
      await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': `e2e-balance-credit-${Date.now()}`,
        },
        payload: {
          amount: 200.00,
          type: 'CREDIT',
        },
      });

      // Create debit transaction
      await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': `e2e-balance-debit-${Date.now()}`,
        },
        payload: {
          amount: 75.00,
          type: 'DEBIT',
        },
      });

      // Get balance
      const response = await app.inject({
        method: 'GET',
        url: '/balance',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('amount');
      expect(typeof body.amount).toBe('number');
      
      // Verify balance is calculated from cached Balance table
      const dbBalance = await prisma.balance.findUnique({
        where: { userId: testUserId },
      });
      expect(dbBalance).not.toBeNull();
      expect(Number(dbBalance!.amount)).toBe(body.amount);
    });
  });

  describe('Transaction Listing', () => {
    it('should list user transactions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('type');
      expect(body[0]).toHaveProperty('amount');
    });

    it('should filter transactions by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/transactions?type=CREDIT',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((transaction: any) => {
        expect(transaction.type).toBe('CREDIT');
      });
    });
  });

  describe('Idempotency', () => {
    it('should return the same transaction for duplicate idempotency key', async () => {
      const idempotencyKey = `e2e-idempotent-${Date.now()}`;

      const response1 = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 50.00,
          type: 'CREDIT',
        },
      });

      const response2 = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 50.00,
          type: 'CREDIT',
        },
      });

      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);
      
      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);
      expect(body1.id).toBe(body2.id);
    });
  });

  describe('Authorization', () => {
    it('should fail without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/transactions',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/transactions',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
