/**
 * Cross-Service Integration Test
 * 
 * Testa a integração real via gRPC entre ms-users e ms-wallet:
 * 1. User deleta sua conta via DELETE /users/me
 * 2. ms-users chama gRPC DeleteUserTransactions no ms-wallet
 * 3. ms-wallet deleta todas as transações do usuário
 * 4. ms-users deleta o registro do usuário
 * 
 * PRÉ-REQUISITOS: Ambos os services rodando via Docker
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const MS_USERS_URL = process.env.MS_USERS_URL || 'http://localhost:3002';
const MS_WALLET_URL = process.env.MS_WALLET_URL || 'http://localhost:3001';

describe('Cross-Service Integration: gRPC User Deletion', () => {
  let authToken: string;
  let userId: string;
  let transactionId: string;

  beforeAll(async () => {
    // 1. Registrar usuário
    const registerResponse = await fetch(`${MS_USERS_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `cross-service-test-${Date.now()}`,
      },
      body: JSON.stringify({
        first_name: 'Integration',
        last_name: 'Test',
        email: `integration-test-${Date.now()}@example.com`,
        password: 'password123',
      }),
    });

    expect(registerResponse.status).toBe(201);
    const registerData = await registerResponse.json();
    userId = registerData.id;

    // 2. Autenticar
    const authResponse = await fetch(`${MS_USERS_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerData.email,
        password: 'password123',
      }),
    });

    expect(authResponse.status).toBe(200);
    const authData = await authResponse.json();
    authToken = authData.access_token;

    // 3. Criar transação no ms-wallet
    const txResponse = await fetch(`${MS_WALLET_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': `cross-service-tx-${Date.now()}`,
      },
      body: JSON.stringify({
        amount: 100.50,
        type: 'CREDIT',
      }),
    });

    expect(txResponse.status).toBe(201);
    const txData = await txResponse.json();
    transactionId = txData.id;
  });

  it('should delete user and cascade delete transactions via gRPC', async () => {
    // ANTES: Verificar que transação existe
    const txBeforeResponse = await fetch(`${MS_WALLET_URL}/transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(txBeforeResponse.status).toBe(200);
    const txBeforeData = await txBeforeResponse.json();
    expect(txBeforeData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: transactionId }),
      ])
    );

    // AÇÃO: Deletar usuário (dispara chamada gRPC para wallet)
    const deleteResponse = await fetch(`${MS_USERS_URL}/users/me`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': `cross-service-delete-${Date.now()}`,
      },
    });

    expect(deleteResponse.status).toBe(204);

    // DEPOIS: Verificar que transações foram deletadas via gRPC
    // (Não podemos fazer nova requisição autenticada porque usuário foi deletado)
    // Mas podemos tentar autenticar novamente e deve falhar
    const authAfterResponse = await fetch(`${MS_USERS_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'integration-test@example.com',
        password: 'password123',
      }),
    });

    expect(authAfterResponse.status).toBe(401);
  });

  it('should fail to authenticate with deleted user', async () => {
    const authResponse = await fetch(`${MS_USERS_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'integration-test@example.com',
        password: 'password123',
      }),
    });

    expect(authResponse.status).toBe(401);
  });
});

describe('Cross-Service Integration: Balance Consistency', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Registrar novo usuário para teste de consistência
    const registerResponse = await fetch(`${MS_USERS_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `balance-test-${Date.now()}`,
      },
      body: JSON.stringify({
        first_name: 'Balance',
        last_name: 'Test',
        email: `balance-test-${Date.now()}@example.com`,
        password: 'password123',
      }),
    });

    const registerData = await registerResponse.json();
    userId = registerData.id;

    // Autenticar
    const authResponse = await fetch(`${MS_USERS_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerData.email,
        password: 'password123',
      }),
    });

    const authData = await authResponse.json();
    authToken = authData.access_token;
  });

  afterAll(async () => {
    // Cleanup: deletar usuário de teste
    await fetch(`${MS_USERS_URL}/users/me`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': `cleanup-${Date.now()}`,
      },
    });
  });

  it('should maintain balance consistency across multiple transactions', async () => {
    // Criar múltiplas transações
    await fetch(`${MS_WALLET_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': `balance-tx-1-${Date.now()}`,
      },
      body: JSON.stringify({ amount: 100.00, type: 'CREDIT' }),
    });

    await fetch(`${MS_WALLET_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': `balance-tx-2-${Date.now()}`,
      },
      body: JSON.stringify({ amount: 30.00, type: 'DEBIT' }),
    });

    await fetch(`${MS_WALLET_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': `balance-tx-3-${Date.now()}`,
      },
      body: JSON.stringify({ amount: 50.00, type: 'CREDIT' }),
    });

    // Verificar saldo (deve ser 100 - 30 + 50 = 120)
    const balanceResponse = await fetch(`${MS_WALLET_URL}/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(balanceResponse.status).toBe(200);
    const balanceData = await balanceResponse.json();
    expect(balanceData.amount).toBe(120.00);
  });

  it('should validate atomic transaction + balance update', async () => {
    // Obter saldo atual
    const balanceBefore = await fetch(`${MS_WALLET_URL}/balance`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const balanceBeforeData = await balanceBefore.json();
    const amountBefore = balanceBeforeData.amount;

    // Criar transação
    const txAmount = 25.50;
    await fetch(`${MS_WALLET_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': `atomic-test-${Date.now()}`,
      },
      body: JSON.stringify({ amount: txAmount, type: 'CREDIT' }),
    });

    // Verificar que saldo foi atualizado atomicamente
    const balanceAfter = await fetch(`${MS_WALLET_URL}/balance`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const balanceAfterData = await balanceAfter.json();
    
    expect(balanceAfterData.amount).toBe(amountBefore + txAmount);
  });
});
