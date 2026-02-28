import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const data = {
    users: await prisma.user.findMany(),
    farms: await prisma.farm.findMany(),
    userFarmRoles: await prisma.userFarmRole.findMany(),
    assumptions: await prisma.assumption.findMany(),
    monthlyData: await prisma.monthlyData.findMany(),
    monthlyDataFrozen: await prisma.monthlyDataFrozen.findMany(),
    farmCategories: await prisma.farmCategory.findMany(),
    glAccounts: await prisma.glAccount.findMany(),
    glActualDetails: await prisma.glActualDetail.findMany(),
    operationalData: await prisma.operationalData.findMany(),
    farmInvites: await prisma.farmInvite.findMany(),
  };

  // Write to stdout
  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
