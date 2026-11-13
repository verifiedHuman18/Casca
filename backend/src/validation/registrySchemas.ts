import { Permission, ScopeType } from '@senoom/shared';
import { z } from 'zod';
import { idSchema } from './common';

const permissions = z.array(z.enum(Permission)).max(Object.values(Permission).length);

export const createClubSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(''),
});

export const updateClubSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .refine(b => b.name !== undefined || b.description !== undefined, {
    message: 'Send a name or a description',
  });

export const createPositionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopeType: z.enum(ScopeType),
  permissions,
});

/** The scope of an existing position never changes: assignments depend on it. */
export const updatePositionSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    permissions: permissions.optional(),
  })
  .refine(b => b.name !== undefined || b.permissions !== undefined, {
    message: 'Send a name or permissions',
  });

export const updateStudentSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    sectionId: idSchema.optional(),
  })
  .refine(b => b.name !== undefined || b.sectionId !== undefined, {
    message: 'Send a name or a sectionId',
  });

export const studentSearchSchema = z.object({
  enrollmentNo: z.string().trim().max(20).default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
