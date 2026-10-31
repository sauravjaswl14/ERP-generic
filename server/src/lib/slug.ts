import { z } from 'zod';

/** Workspace names that would be confusing or collide with product URLs. */
const RESERVED = new Set(['admin', 'api', 'app', 'www', 'login', 'signup', 'register', 'support', 'status', 'system', 'root', 'null', 'undefined']);

/** Lowercase letters, digits and hyphens, 3-40 characters, not starting or ending with a hyphen. */
export const workspaceSlug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/, 'Use 3-40 lowercase letters, numbers or hyphens, starting and ending with a letter or number')
  .refine((s) => !RESERVED.has(s), 'That workspace name is reserved');
