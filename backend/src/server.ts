/**
 * Team integration entry point.
 * Import createEventRouter from the package and mount it in the team's existing Express app.
 * Authentication and Member A's PermissionService are intentionally injected by the team.
 */
import express from 'express';
import { Pool } from 'pg';
import { createEventRouter } from './events/routes/event.routes';
import { EventPermissionGateway } from './events/permissions/EventPermissionGateway';

export function createApp(
  pool: Pool,
  permissionGateway: EventPermissionGateway,
  authenticationMiddleware: express.RequestHandler
) {
  const app = express();
  app.use(express.json());
  app.use('/api', createEventRouter(pool, permissionGateway, authenticationMiddleware));
  return app;
}
