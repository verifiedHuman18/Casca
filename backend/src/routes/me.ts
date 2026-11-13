import type { MeResponse } from '@senoom/shared';
import { RequestHandler, Router } from 'express';
import { currentUser } from '../middleware/requireAuth';
import type { PermissionService } from '../services/PermissionService';

/** GET /api/me. Built from the database on this request, so a revoke shows up immediately. */
export function createMeRouter(
  requireAuth: RequestHandler,
  permissions: PermissionService
): Router {
  const router = Router();
  router.get('/me', requireAuth, (req, res) => {
    const user = currentUser(req);
    const body: MeResponse = { user, permissions: permissions.listPermissions(user) };
    res.json(body);
  });
  return router;
}
