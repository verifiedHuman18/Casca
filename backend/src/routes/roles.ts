import { RequestHandler, Router } from 'express';
import type { RoleController } from '../controllers/RoleController';

/**
 * Mounted at /api. `manageRoles` is requirePermission(u => permissions.canManageRoles(u)).
 * Listing is open to any logged-in user because the service allows only the student themself
 * or someone with MANAGE_ROLES.
 */
export function createRoleRouter(
  c: RoleController,
  requireAuth: RequestHandler,
  manageRoles: RequestHandler
): Router {
  const router = Router();
  router.post('/role-assignments', requireAuth, manageRoles, c.assign);
  router.post('/role-assignments/:id/revoke', requireAuth, manageRoles, c.revoke);
  router.get('/students/:id/role-assignments', requireAuth, c.listForStudent);
  return router;
}
