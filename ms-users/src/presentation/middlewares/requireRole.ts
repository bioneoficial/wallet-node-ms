import { FastifyRequest, FastifyReply } from 'fastify';

export type UserRole = 'USER' | 'ADMIN';

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userRole = request.user?.role as UserRole | undefined;

    if (!userRole) {
      reply.status(401).send({ error: 'Unauthorized', message: 'User role not found' });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      reply.status(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
      return;
    }
  };
}
