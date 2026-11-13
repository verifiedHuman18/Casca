import type { RoleAssignmentDto } from '@senoom/shared';
import type { Request, Response } from 'express';
import type { RoleAssignment } from '../domain/RoleAssignment';
import { currentUser } from '../middleware/requireAuth';
import type { RoleService } from '../services/RoleService';
import { idSchema } from '../validation/common';
import { assignmentListSchema, assignRoleSchema } from '../validation/roleSchemas';

export function toAssignmentDto(a: RoleAssignment, now = new Date()): RoleAssignmentDto {
  return {
    assignmentId: a.id,
    studentId: a.studentId,
    positionId: a.position.positionId,
    positionName: a.position.name,
    scopeType: a.position.scopeType,
    clubId: a.club?.clubId ?? null,
    clubName: a.club?.name ?? null,
    sectionId: a.section?.sectionId ?? null,
    sectionName: a.section?.getName() ?? null,
    assignedBy: a.assignedBy,
    assignedOn: a.assignedOn.toISOString(),
    endsOn: a.endsOn ? a.endsOn.toISOString() : null,
    active: a.isActive(now),
  };
}

/** Parses the request, calls RoleService, shapes the response. No business rules here. */
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  assign = async (req: Request, res: Response): Promise<void> => {
    const created = await this.roles.assign(currentUser(req), assignRoleSchema.parse(req.body));
    res.status(201).json(toAssignmentDto(created));
  };

  revoke = async (req: Request, res: Response): Promise<void> => {
    const ended = await this.roles.revoke(currentUser(req), idSchema.parse(req.params.id));
    res.json(toAssignmentDto(ended));
  };

  listForStudent = async (req: Request, res: Response): Promise<void> => {
    const { limit, offset } = assignmentListSchema.parse(req.query);
    const list = await this.roles.listForStudent(
      currentUser(req),
      idSchema.parse(req.params.id),
      limit,
      offset
    );
    res.json(list.map(a => toAssignmentDto(a)));
  };
}
