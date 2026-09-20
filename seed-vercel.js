import { PrismaClient } from './src/generated/client/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedVercel() {
  console.log('Seeding permanent Vercel demo user...');
  
  await prisma.user.deleteMany({});
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      email: 'demo@moneymate.com',
      name: 'Shreyanshi',
      password: hashedPassword,
      monthlyBudget: 50000,
      monthlyIncome: 80000
    }
  });

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, amount: 1500, category: 'Food', type: 'expense', merchant: 'Pizza Hut', date: new Date().toISOString(), emoji: '🍕' },
      { userId: user.id, amount: 20000, category: 'Housing', type: 'expense', merchant: 'Rent', date: new Date().toISOString(), emoji: '🏠' },
    ]
  });

  console.log('User created:', user.email);
}
seedVercel().finally(() => prisma.$disconnect());
