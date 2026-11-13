import { z } from 'zod';
import { idSchema } from './common';

/** Which of clubId and sectionId is needed depends on the position's scope; the domain checks it. */
export const assignRoleSchema = z.object({
  studentId: idSchema,
  positionId: idSchema,
  clubId: idSchema.optional(),
  sectionId: idSchema.optional(),
});

export const assignmentListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
