import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node src/scripts/importData.js <export.json>');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(file, 'utf8'));

  // Delete existing data in reverse-dependency order
  console.log('Clearing existing data...');
  await prisma.glActualDetail.deleteMany();
  await prisma.glAccount.deleteMany();
  await prisma.farmCategory.deleteMany();
  await prisma.monthlyDataFrozen.deleteMany();
  await prisma.monthlyData.deleteMany();
  await prisma.assumption.deleteMany();
  await prisma.operationalData.deleteMany();
  await prisma.farmInvite.deleteMany();
  await prisma.userFarmRole.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();

  // Import in dependency order
  if (data.users?.length) {
    console.log(`Importing ${data.users.length} users...`);
    for (const r of data.users) {
      await prisma.user.create({ data: r });
    }
  }

  if (data.farms?.length) {
    console.log(`Importing ${data.farms.length} farms...`);
    for (const r of data.farms) {
      await prisma.farm.create({ data: r });
    }
  }

  if (data.userFarmRoles?.length) {
    console.log(`Importing ${data.userFarmRoles.length} userFarmRoles...`);
    for (const r of data.userFarmRoles) {
      await prisma.userFarmRole.create({ data: r });
    }
  }

  if (data.assumptions?.length) {
    console.log(`Importing ${data.assumptions.length} assumptions...`);
    for (const r of data.assumptions) {
      await prisma.assumption.create({ data: r });
    }
  }

  if (data.monthlyData?.length) {
    console.log(`Importing ${data.monthlyData.length} monthlyData...`);
    for (const r of data.monthlyData) {
      await prisma.monthlyData.create({ data: r });
    }
  }

  if (data.monthlyDataFrozen?.length) {
    console.log(`Importing ${data.monthlyDataFrozen.length} monthlyDataFrozen...`);
    for (const r of data.monthlyDataFrozen) {
      await prisma.monthlyDataFrozen.create({ data: r });
    }
  }

  if (data.farmCategories?.length) {
    // Import parents first (level 0), then children (level 1+)
    const sorted = [...data.farmCategories].sort((a, b) => a.level - b.level);
    console.log(`Importing ${sorted.length} farmCategories...`);
    for (const r of sorted) {
      await prisma.farmCategory.create({ data: r });
    }
  }

  if (data.glAccounts?.length) {
    console.log(`Importing ${data.glAccounts.length} glAccounts...`);
    for (const r of data.glAccounts) {
      await prisma.glAccount.create({ data: r });
    }
  }

  if (data.glActualDetails?.length) {
    console.log(`Importing ${data.glActualDetails.length} glActualDetails...`);
    // Batch in chunks of 100 for performance
    for (let i = 0; i < data.glActualDetails.length; i += 100) {
      const chunk = data.glActualDetails.slice(i, i + 100);
      await prisma.glActualDetail.createMany({ data: chunk });
    }
  }

  if (data.operationalData?.length) {
    console.log(`Importing ${data.operationalData.length} operationalData...`);
    for (const r of data.operationalData) {
      await prisma.operationalData.create({ data: r });
    }
  }

  if (data.farmInvites?.length) {
    console.log(`Importing ${data.farmInvites.length} farmInvites...`);
    for (const r of data.farmInvites) {
      await prisma.farmInvite.create({ data: r });
    }
  }

  console.log('Import complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
