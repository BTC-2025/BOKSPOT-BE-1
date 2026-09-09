const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    select: { id: true, name: true, city: true, merchant: { select: { city: true } } }
  });
  console.log(services);
}
main().catch(console.error).finally(() => prisma.$disconnect());
