import 'dotenv/config';
import { parseArgs } from 'node:util';
import { workspaceSlug } from '../lib/slug';
import { provisionTenant } from '../lib/tenants';
import { prismaBase } from '../lib/prisma';

const USAGE = `Usage: npm run tenant:create -w server -- --slug acme --name "Acme Ltd" --admin-email boss@acme.com [--admin-name "Acme Admin"] [--admin-password ...]

The admin password can also be passed in the ADMIN_PASSWORD environment variable (keeps it out of shell history).`;

async function main() {
  const { values } = parseArgs({
    options: {
      slug: { type: 'string' },
      name: { type: 'string' },
      'admin-email': { type: 'string' },
      'admin-name': { type: 'string' },
      'admin-password': { type: 'string' },
    },
  });
  const password = values['admin-password'] ?? process.env.ADMIN_PASSWORD;
  if (!values.slug || !values.name || !values['admin-email'] || !password) {
    console.error(USAGE);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('The admin password must be at least 8 characters.');
    process.exit(1);
  }
  const slug = workspaceSlug.parse(values.slug);
  const { tenant, admin } = await provisionTenant({
    slug,
    name: values.name,
    adminName: values['admin-name'] ?? `${values.name} Admin`,
    adminEmail: values['admin-email'],
    adminPassword: password,
  });
  console.log(`Created workspace "${tenant.slug}" (${tenant.name}) with admin ${admin.email}.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prismaBase.$disconnect());
