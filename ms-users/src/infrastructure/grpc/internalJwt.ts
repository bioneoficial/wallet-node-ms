import jwt, { JwtPayload } from 'jsonwebtoken';

export const INTERNAL_JWT_ISSUER = 'users';
export const INTERNAL_JWT_AUDIENCE = 'wallet';
export const INTERNAL_JWT_EXPIRES_IN = '5m';

export interface InternalJwtPayload extends JwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];
}

export function createInternalJwt(userId: string, secret: string): string {
  return jwt.sign(
    { sub: userId },
    secret,
    {
      issuer: INTERNAL_JWT_ISSUER,
      audience: INTERNAL_JWT_AUDIENCE,
      expiresIn: INTERNAL_JWT_EXPIRES_IN,
    }
  );
}
