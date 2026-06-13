import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 1. إنشاء مدير النظام
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'مدير النظام',
      role: 'ADMIN',
    },
  });

  // 2. إضافة طاولات بلياردو
  const billiardNames = ['طاولة 1', 'طاولة 2', 'طاولة 3', 'طاولة 4'];
  for (const name of billiardNames) {
    await prisma.resource.create({
      data: {
        name,
        type: 'BILLIARD_TABLE',
        status: 'AVAILABLE',
        prices: {
          create: [
            { durationMin: 30, price: 15 },
            { durationMin: 60, price: 30 },
            { durationMin: 120, price: 60 },
            { durationMin: 0, price: 30 }, // سعر الساعة للوقت المفتوح
          ],
        },
      },
    });
  }

  // 3. إضافة أجهزة بلايستيشن
  const psDevices = [
    { name: 'PS5 - VIP 1', price: 35 },
    { name: 'PS5 - VIP 2', price: 35 },
    { name: 'PS4 - Room 1', price: 25 },
  ];

  for (const ps of psDevices) {
    await prisma.resource.create({
      data: {
        name: ps.name,
        type: 'PLAYSTATION',
        status: 'AVAILABLE',
        prices: {
          create: [
            { durationMin: 60, price: ps.price },
            { durationMin: 120, price: ps.price * 2 },
            { durationMin: 0, price: ps.price },
          ],
        },
      },
    });
  }

  console.log('✅ تم إنشاء البيانات الأولية بنجاح!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
