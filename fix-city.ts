const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.service.updateMany({
    where: { category: { slug: 'resorts' }, city: null },
    data: { city: 'Bangalore' }
  });
  console.log('Fixed Resort Booking city to Bangalore.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
