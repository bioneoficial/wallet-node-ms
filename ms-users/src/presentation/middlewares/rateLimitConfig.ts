import { FastifyRequest } from 'fastify';

export const globalRateLimitConfig = {
  max: 100, // 100 requests
  timeWindow: '1 minute', // per minute
  cache: 10000, // cache size
  allowList: ['127.0.0.1'], // whitelist localhost for tests
  skipOnError: true, // don't block on Redis errors
  keyGenerator: (request: FastifyRequest) => {
    // Use IP address as key
    return request.ip;
  },
  errorResponseBuilder: () => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    };
  },
};

export const authRateLimitConfig = {
  max: 5, // 5 requests
  timeWindow: '1 minute', // per minute
  keyGenerator: (request: FastifyRequest) => {
    return request.ip;
  },
  errorResponseBuilder: () => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please try again in 1 minute.',
    };
  },
};

export const userCreationRateLimitConfig = {
  max: 3, // 3 user registrations
  timeWindow: '5 minutes', // per 5 minutes
  keyGenerator: (request: FastifyRequest) => {
    return request.ip;
  },
  errorResponseBuilder: () => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many registration attempts. Please try again in 5 minutes.',
    };
  },
};
