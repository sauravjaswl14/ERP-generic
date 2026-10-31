import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authRouter } from './auth';
import { usersRouter } from './users';
import { resourcesRouter } from './resources';
import { ordersRouter } from './orders';
import { inventoryRouter } from './inventory';
import { accountingRouter } from './accounting';
import { payrollRouter } from './payroll';
import { dashboardRouter } from './dashboard';
import { auditRouter } from './audit';
import { tenantsRouter } from './tenants';

export const routes = Router();

routes.get('/health', (_req, res) => res.json({ status: 'ok' }));
routes.use('/auth', authRouter);
routes.use('/tenants', tenantsRouter);

// Everything below requires a valid session.
routes.use(authenticate);
routes.use('/dashboard', dashboardRouter);
routes.use('/users', usersRouter);
routes.use('/audit-logs', auditRouter);
routes.use('/inventory', inventoryRouter);
routes.use('/accounting', accountingRouter);
routes.use('/', payrollRouter);
routes.use('/', ordersRouter);
routes.use('/', resourcesRouter);
