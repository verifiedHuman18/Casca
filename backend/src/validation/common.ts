import { z } from 'zod';

/** PostgreSQL throws on a malformed uuid, so every id from a URL or body is checked first. */
export const idSchema = z.uuid();
