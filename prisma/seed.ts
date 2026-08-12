import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.tariff.createMany({
    data: [
      { code: 'DAYSAVER', name: 'DaySaver', grossPrice: 19.90, taxPercent: 19 },
      { code: 'SINGLE', name: 'Einzelfahrt', grossPrice: 9.90, taxPercent: 19 },
      { code: 'RETURN', name: 'Hin- und Rückfahrt', grossPrice: 17.90, taxPercent: 19 },
      { code: 'WEEK', name: 'Wochenkarte', grossPrice: 49.90, taxPercent: 19 },
      { code: 'MONTH', name: 'Monatskarte', grossPrice: 149.90, taxPercent: 19 },
      { code: 'WORKER', name: 'Arbeiter', grossPrice: 0.00, taxPercent: 0 },
    ],
    skipDuplicates: true
  });

  const bcrypt = require('bcrypt');
  const saltHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@foehr.de' },
    update: {},
    create: {
      email: 'admin@foehr.de',
      name: 'Admin',
      password: saltHash,
      role: 'ADMIN'
    }
  });

  console.log('Seed complete');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect() });
