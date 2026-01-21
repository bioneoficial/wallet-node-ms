import jwt from 'jsonwebtoken';
import {
  verifyInternalJwt,
  INTERNAL_JWT_AUDIENCE,
  INTERNAL_JWT_ISSUER,
} from '../../src/infrastructure/grpc/internalJwt.js';

describe('internalJwt (ms-wallet)', () => {
  const secret = 'wallet-secret';

  const buildToken = (overrides?: { aud?: string; iss?: string }) =>
    jwt.sign({ sub: 'user-123' }, secret, {
      issuer: overrides?.iss ?? INTERNAL_JWT_ISSUER,
      audience: overrides?.aud ?? INTERNAL_JWT_AUDIENCE,
      expiresIn: '5m',
    });

  it('should verify a valid JWT', () => {
    const token = buildToken();
    const payload = verifyInternalJwt(token, secret);

    expect(payload.sub).toBe('user-123');
  });

  it('should reject tokens with wrong audience', () => {
    const token = buildToken({ aud: 'invalid' });

    expect(() => verifyInternalJwt(token, secret)).toThrow();
  });
});
