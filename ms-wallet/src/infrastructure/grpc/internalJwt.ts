import jwt, { JwtPayload } from 'jsonwebtoken';

export const INTERNAL_JWT_ISSUER = 'users';
export const INTERNAL_JWT_AUDIENCE = 'wallet';

export interface InternalJwtPayload extends JwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];
}

export function verifyInternalJwt(token: string, secret: string): InternalJwtPayload {
  return jwt.verify(token, secret, {
    issuer: INTERNAL_JWT_ISSUER,
    audience: INTERNAL_JWT_AUDIENCE,
  }) as InternalJwtPayload;
}
