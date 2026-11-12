import { UserType, ScopeType } from '@senoom/shared';

/**
 * Casca - Backend Service Entrypoint
 */
export function initializeServer(): void {
  console.info('Starting Casca Backend...');
  console.info(`Initialized with scopes: ${Object.values(ScopeType).join(', ')}`);
  console.info(`Default user types: ${Object.values(UserType).join(', ')}`);
}

if (process.env.NODE_ENV !== 'test') {
  initializeServer();
}
