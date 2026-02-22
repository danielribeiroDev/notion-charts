import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for seeding');
}

const adapter = new PrismaPg(new Pool({ connectionString: DATABASE_URL }));
const prisma = new PrismaClient({ adapter });

const BCRYPT_HASH_FOR_PASSWORD =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Cqk0siJY9hwTknro3Atjq.GjO6smS'; // password: "password"

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'founder@notioncharts.local' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'founder@notioncharts.local',
      passwordHash: BCRYPT_HASH_FOR_PASSWORD,
      planType: 'FREE',
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: { name: 'Demo Workspace' },
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'Demo Workspace',
      userId: user.id,
    },
  });

  await prisma.notionCredential.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000201',
      workspaceId: workspace.id,
      encryptedAccessToken: 'encrypted-placeholder',
      botId: 'bot-demo',
    },
  });

  const chart = await prisma.chart.upsert({
    where: { id: '00000000-0000-0000-0000-000000000301' },
    update: {
      configJson: {
        title: 'Demo Chart',
        type: 'bar',
        xField: 'Date',
        yField: 'Value',
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000301',
      workspaceId: workspace.id,
      notionDatabaseId: 'notion-database-placeholder',
      configJson: {
        title: 'Demo Chart',
        type: 'bar',
        xField: 'Date',
        yField: 'Value',
      },
      lastSyncedAt: null,
    },
  });

  await prisma.chartDataSnapshot.upsert({
    where: { id: '00000000-0000-0000-0000-000000000401' },
    update: {
      payloadJson: { data: [{ x: '2024-01-01', y: 10 }] },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000401',
      chartId: chart.id,
      payloadJson: { data: [{ x: '2024-01-01', y: 10 }] },
    },
  });
}

main()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
