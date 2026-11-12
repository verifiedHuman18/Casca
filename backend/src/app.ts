import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { AuthController } from './controllers/AuthController';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createAuthLimiters, type AuthLimiters } from './middleware/rateLimiters';
import { createRequireAuth } from './middleware/requireAuth';
import { createAuthRouter } from './routes/auth';
import type { AuthService } from './services/AuthService';

export interface AppDeps {
  authService: AuthService;
  limiters?: AuthLimiters;
  /** Origins allowed to call the API from a browser. The native app does not need CORS. */
  corsOrigins?: string[];
  /** Set when running behind a reverse proxy, so rate limits see the real client IP. */
  trustProxy?: boolean;
}

/** Builds the Express app from its dependencies, so tests can pass fakes. */
export function createApp(deps: AppDeps): Express {
  const app = express();
  if (deps.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: deps.corsOrigins ?? [] }));
  app.use(express.json({ limit: '10kb' }));

  const requireAuth = createRequireAuth(deps.authService);

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
  // Phases 7 and 8 mount their routers here, passing requireAuth and PermissionService.

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
