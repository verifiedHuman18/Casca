import { z } from 'zod';
import { idSchema } from './common';

/**
 * PLACEHOLDER: replace with the real enrollment number pattern once the team confirms it
 * (for example IIT2025257). Kept in one place so it is a one-line change.
 */
export const ENROLLMENT_PATTERN = /^[A-Za-z0-9-]{4,20}$/;

const password = z.string().min(1).max(200); // real rules live in PasswordHasher.validate

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(100),
  enrollmentNo: z
    .string()
    .trim()
    .regex(ENROLLMENT_PATTERN, 'Enrollment number is not in a valid format'),
  sectionId: idSchema,
  password,
});

/** Students send enrollmentNo, admins send email. Exactly one of them. */
export const loginSchema = z
  .object({
    enrollmentNo: z.string().trim().min(1).max(50).optional(),
    email: z.string().trim().min(1).max(254).optional(),
    password,
  })
  .refine(b => Boolean(b.enrollmentNo) !== Boolean(b.email), {
    message: 'Send either enrollmentNo or email, not both',
  });

export const changePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
});
