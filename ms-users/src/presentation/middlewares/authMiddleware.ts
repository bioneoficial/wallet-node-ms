import { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Unauthorized', message: 'Access token is missing or invalid' });
  }
}
