/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 60000, // 60s para testes de integração (inclui setup de dados)
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        target: 'ES2022',
      },
    }],
  },
};
