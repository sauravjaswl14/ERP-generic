import { app } from './app';
import { config } from './config';
import { prisma } from './lib/prisma';

const server = app.listen(config.port, () => {
  console.log(`ERP API listening on http://localhost:${config.port}/api`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
