import jwt, { JwtPayload } from 'jsonwebtoken';
import {
  createInternalJwt,
  INTERNAL_JWT_AUDIENCE,
  INTERNAL_JWT_ISSUER,
} from '../../src/infrastructure/grpc/internalJwt.js';

describe('internalJwt (ms-users)', () => {
  const secret = 'test-secret';

  it('should create a JWT with expected claims', () => {
    const token = createInternalJwt('user-123', secret);

    const payload = jwt.verify(token, secret, {
      issuer: INTERNAL_JWT_ISSUER,
      audience: INTERNAL_JWT_AUDIENCE,
    }) as JwtPayload;

    expect(payload.sub).toBe('user-123');
    expect(payload.iss).toBe(INTERNAL_JWT_ISSUER);
    expect(payload.aud).toBe(INTERNAL_JWT_AUDIENCE);
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
  });

  it('should reject tokens signed with a different secret', () => {
    const token = createInternalJwt('user-123', secret);

    expect(() => {
      jwt.verify(token, 'wrong-secret', {
        issuer: INTERNAL_JWT_ISSUER,
        audience: INTERNAL_JWT_AUDIENCE,
      });
    }).toThrow();
  });
});
