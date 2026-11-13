import { RequestHandler, Router } from 'express';
import type { RegistryController } from '../controllers/RegistryController';

/**
 * Mounted at /api. `manageRegistry` is requirePermission(u => permissions.canManageRegistry(u)).
 * Only GET /sections is public, so the sign-up screen can list sections.
 */
export function createRegistryRouter(
  c: RegistryController,
  requireAuth: RequestHandler,
  manageRegistry: RequestHandler
): Router {
  const router = Router();

  router.get('/sections', c.listSections);

  router.get('/clubs', requireAuth, c.listClubs);
  router.get('/clubs/:id', requireAuth, c.getClub);
  router.get('/clubs/:id/members', requireAuth, c.listClubMembers);
  router.post('/clubs', requireAuth, manageRegistry, c.createClub);
  router.patch('/clubs/:id', requireAuth, manageRegistry, c.updateClub);

  router.get('/positions', requireAuth, c.listPositions);
  router.post('/positions', requireAuth, manageRegistry, c.createPosition);
  router.patch('/positions/:id', requireAuth, manageRegistry, c.updatePosition);

  router.get('/students', requireAuth, manageRegistry, c.searchStudents);
  router.get('/students/:id', requireAuth, manageRegistry, c.getStudent);
  router.patch('/students/:id', requireAuth, manageRegistry, c.updateStudent);
  router.delete('/students/:id', requireAuth, manageRegistry, c.removeStudent);

  return router;
}
