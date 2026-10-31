# ERP Suite (PERN + TypeScript + Tailwind)

Monorepo with two npm workspaces:

| Workspace | Stack |
| --- | --- |
| `server` | Node, Express, TypeScript, Prisma ORM, PostgreSQL, Zod, JWT, bcrypt, Helmet, rate-limited login |
| `client` | React 18, TypeScript, Vite, Tailwind CSS 3, React Router, TanStack Query |

## Quick start

```bash
docker compose up -d                 # PostgreSQL 16 on :5432 (user/pass/db = erp)
npm install
cp server/.env.example server/.env   # already present if you used the provided one
npm run db:push                      # create tables  (or: npm run db:migrate)
npm run db:seed                      # demo users, chart of accounts, sample data
npm run dev                          # API :4000, web :5173
```

Sign in at http://localhost:5173 with `admin@erp.local` / `Admin@123`.
The seed creates one user per role, all sharing that password:
`manager@`, `hr@`, `sales@`, `purchasing@`, `inventory@`, `accountant@`, `employee@` `erp.local`.

**Before production:** set `JWT_SECRET` (32+ chars, enforced when `NODE_ENV=production`), `CLIENT_ORIGIN`, and change every seeded password.

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Role-aware KPIs: revenue, receivables, overdue invoices, stock value, low stock, open POs, headcount, pending leave, tasks |
| **HR** | Departments, employees, leave requests (approve/reject), attendance, monthly payroll runs |
| **CRM** | Leads pipeline, customers |
| **Sales** | Sales orders with line items, discounts and tax → invoices → payments |
| **Purchasing** | Suppliers, purchase orders (draft → ordered → received → paid) |
| **Inventory** | Products, warehouses, stock per warehouse, adjustments, transfers, immutable movement history, reorder alerts |
| **Accounting** | Chart of accounts, balanced manual journal entries, trial balance with assets/liabilities/equity/revenue/expense summary |
| **Projects** | Projects and tasks with status, priority, assignee |
| **Administration** | User and role management, audit log |

## How the modules connect

Everything runs inside database transactions, so documents, stock and ledger always commit together.

- **Confirm sales order** → stock issued (guarded atomic decrement; fails on insufficient stock) → invoice raised (net 30) → journal: Dr Receivables, Dr COGS / Cr Revenue, Cr Sales tax, Cr Inventory.
- **Record invoice payment** → invoice becomes Partial/Paid → journal: Dr Cash / Cr Receivables. Overpayment is rejected.
- **Receive purchase order** → stock in, moving-average cost updated → journal: Dr Inventory / Cr Payable. **Pay supplier** → Dr Payable / Cr Cash.
- **Pay payroll line** → journal: Dr Salaries expense / Cr Cash.
- Document numbers (`SO-00001`, `INV-00001`, `PO-…`, `JE-…`) come from an atomic sequence table.
- Automatic postings use accounts 1000, 1100, 1200, 2000, 2100, 4000, 5000, 5100 (seeded). Keep them.

## Roles

`ADMIN` can do everything. Other roles are matched per module in `server/src/lib/permissions.ts` (enforced by the API) and mirrored in `client/src/lib/access.ts` (menu and page visibility only).

| Role | Read | Write |
| --- | --- | --- |
| MANAGER | HR, CRM, sales, purchasing, inventory, accounting, projects | Projects |
| HR | HR, payroll | HR, payroll |
| SALES | CRM, sales, invoices, inventory | CRM, sales orders, invoice payments |
| PURCHASING | Purchasing, inventory | Purchasing |
| INVENTORY | Inventory, sales, purchasing | Inventory (and receiving goods) |
| ACCOUNTANT | Accounting, invoices, payroll, sales, purchasing, inventory | Accounting, invoice payments |
| EMPLOYEE | Projects | — |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API and web with hot reload |
| `npm run build` | Compile server (runs `prisma generate`) and client |
| `npm run typecheck` | Type-check both workspaces |
| `npm run db:push` / `db:migrate` / `db:seed` | Schema sync, migrations, demo data |

## Adding a new master-data resource

1. Add the model to `server/prisma/schema.prisma` and a Zod schema in `server/src/lib/schemas.ts`.
2. Register `crud({ model, schema, ...P.<module> })` in `server/src/routes/resources.ts`.
3. Add a page using `<ResourcePage>` (columns + form fields) in `client/src/pages`, a route in `App.tsx` and a menu item in `components/Layout.tsx`.

## Not included yet

Email notifications, file attachments, multi-currency, multi-company, multi-step approval workflows, and automated tests. Pagination, search and filters exist on all list pages.
