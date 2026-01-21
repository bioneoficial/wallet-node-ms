import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/infrastructure/database/prisma.js';

describe('E2E: User Flow', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup: delete test user if exists
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  describe('User Registration and Authentication', () => {
    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          'idempotency-key': `e2e-register-${Date.now()}`,
        },
        payload: {
          first_name: 'E2E',
          last_name: 'Test',
          email: `e2e-test-${Date.now()}@example.com`,
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('email');
      expect(body).not.toHaveProperty('password');
      
      userId = body.id;
    });

    it('should authenticate the user', async () => {
      const email = `e2e-test-${userId}@example.com`;
      
      // Get user email from database
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user).not.toBeNull();

      const response = await app.inject({
        method: 'POST',
        url: '/auth',
        payload: {
          email: user!.email,
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('access_token');
      expect(body.user).toHaveProperty('id', userId);
      
      authToken = body.access_token;
    });

    it('should get user profile with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', userId);
      expect(body).toHaveProperty('email');
    });

    it('should update user profile', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': `e2e-update-${Date.now()}`,
        },
        payload: {
          first_name: 'E2E Updated',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.first_name).toBe('E2E Updated');
    });

    it('should fail to access user profile without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail to list all users as regular user (not admin)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Forbidden');
    });
  });

  describe('Idempotency', () => {
    it('should return the same response for duplicate idempotency key', async () => {
      const idempotencyKey = `e2e-idempotent-${Date.now()}`;
      
      const response1 = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          last_name: 'Idempotent Test',
        },
      });

      const response2 = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          last_name: 'Idempotent Test',
        },
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(response1.body).toBe(response2.body);
    });

    it('should return 409 for same idempotency key with different payload', async () => {
      const idempotencyKey = `e2e-conflict-${Date.now()}`;
      
      await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          last_name: 'First Attempt',
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          last_name: 'Different Attempt',
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });
});
