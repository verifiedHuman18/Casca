import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Pool } from 'pg';
import { AuthController } from './controllers/AuthController';
import { RegistryController } from './controllers/RegistryController';
import { PermissionServiceEventGateway } from './events/permissions/PermissionServiceEventGateway';
import { createEventRouter } from './events/routes/event.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createAuthLimiters, type AuthLimiters } from './middleware/rateLimiters';
import { createRequireAuth } from './middleware/requireAuth';
import { requirePermission } from './middleware/requirePermission';
import { createAuthRouter } from './routes/auth';
import { createRegistryRouter } from './routes/registry';
import type { AuthService } from './services/AuthService';
import { PermissionService } from './services/PermissionService';
import type { RegistryService } from './services/RegistryService';
import { RoleController } from './controllers/RoleController';
import { createMeRouter } from './routes/me';
import { createRoleRouter } from './routes/roles';
import type { RoleService } from './services/RoleService';
export interface AppDeps {
  authService: AuthService;
  /** Source of the permission answers for every route. Defaults to the real rules. */
  permissions?: PermissionService;
  /** Sections, clubs, positions and students. Without it those routes are not mounted. */
  registry?: RegistryService;
  /** Database pool for the events and calendar module. Without it those routes are not mounted. */
  pool?: Pool;
  limiters?: AuthLimiters;
  /** Origins allowed to call the API from a browser. The native app does not need CORS. */
  corsOrigins?: string[];
  /** Set when running behind a reverse proxy, so rate limits see the real client IP. */
  trustProxy?: boolean;
  /** Assign, revoke and list role assignments. Without it those routes are not mounted. */
  roles?: RoleService;
}

/** Builds the Express app from its dependencies, so tests can pass fakes. */
export function createApp(deps: AppDeps): Express {
  const app = express();
  if (deps.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: deps.corsOrigins ?? [] }));
  app.use(express.json({ limit: '10kb' }));

  const requireAuth = createRequireAuth(deps.authService);
  const permissions = deps.permissions ?? new PermissionService();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(
    '/api/auth',
    createAuthRouter(
      new AuthController(deps.authService),
      requireAuth,
      deps.limiters ?? createAuthLimiters()
    )
  );
  // Registry routes come before the events router, because that router requires auth on all of /api.
  if (deps.registry) {
    app.use(
      '/api',
      createRegistryRouter(
        new RegistryController(deps.registry),
        requireAuth,
        requirePermission(user => permissions.canManageRegistry(user))
      )
    );
  }
  // Phase 8 mounts role assignment and GET /api/me here.

  // Phases 7 and 8 mount their routers here, passing requireAuth and PermissionService.
  app.use('/api', createMeRouter(requireAuth, permissions));
  if (deps.roles) {
    app.use(
      '/api',
      createRoleRouter(
        new RoleController(deps.roles),
        requireAuth,
        requirePermission(user => permissions.canManageRoles(user))
      )
    );
  }

  if (deps.pool) {
    // requireAuth runs here, not inside the events router, so a 401 reaches the shared
    // errorHandler instead of the events module's own handler. The router's built-in
    // authentication step is replaced by a no-op.
    app.use(
      '/api',
      requireAuth,
      createEventRouter(
        deps.pool,
        new PermissionServiceEventGateway(permissions),
        (_req, _res, next) => next()
      )
    );
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
