import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { audit } from '../lib/crud';
import { workspaceSlug } from '../lib/slug';
import { provisionTenant } from '../lib/tenants';
import { runWithTenant } from '../lib/tenant-context';
import { asyncHandler, HttpError } from '../middleware/error';
import { signToken } from '../middleware/auth';

/** Public endpoints (no session yet): sign-up for a new workspace. */
export const tenantsRouter = Router();

// Lets the login page decide whether to offer "Create a workspace".
tenantsRouter.get('/config', (_req, res) => res.json({ signupEnabled: config.allowTenantSignup }));

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-ups from this address, please try again later' },
});

const signupSchema = z.object({
  workspace: workspaceSlug,
  companyName: z.string().trim().min(2, 'Company name is required').max(120),
  adminName: z.string().trim().min(1, 'Your name is required').max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

tenantsRouter.post(
  '/register',
  signupLimiter,
  asyncHandler(async (req, res) => {
    if (!config.allowTenantSignup) throw new HttpError(403, 'Workspace sign-up is disabled. Ask an operator to create one for you.');
    const d = signupSchema.parse(req.body);
    const { tenant, admin } = await provisionTenant({
      slug: d.workspace,
      name: d.companyName,
      adminName: d.adminName,
      adminEmail: d.email,
      adminPassword: d.password,
    });
    const user = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      tenantId: tenant.id,
      tenant: { slug: tenant.slug, name: tenant.name },
    };
    req.user = user;
    await runWithTenant(tenant.id, () => audit(req, 'CREATE', 'tenant', tenant.id));
    res.status(201).json({ token: signToken(user), user });
  }),
);
