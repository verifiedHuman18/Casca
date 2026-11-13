import { RequestHandler, Router } from 'express';
import type { AuthController } from '../controllers/AuthController';
import type { AuthLimiters } from '../middleware/rateLimiters';

export function createAuthRouter(
  controller: AuthController,
  requireAuth: RequestHandler,
  limiters: AuthLimiters
): Router {
  const router = Router();
  router.post('/signup', limiters.signup, controller.signUp);
  router.post('/login', limiters.loginByIp, limiters.loginByAccount, controller.login);
  router.post('/logout', requireAuth, controller.logout);
  router.post('/change-password', requireAuth, controller.changePassword);
  return router;
}
