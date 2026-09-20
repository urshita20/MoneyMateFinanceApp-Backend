import { PrismaClient } from './src/generated/client/index.js';
import { processChat } from './src/services/ai.engine.js';

const prisma = new PrismaClient();

async function test() {
  try {
    let user = await prisma.user.create({
      data: {
        email: 'test_tx@test.com',
        name: 'Test Tx',
        password: 'pass'
      }
    });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        merchant: 'Uber',
        amount: 500,
        category: 'Transport',
        type: 'expense',
        emoji: '🚗',
        date: new Date().toISOString()
      }
    });

    console.log('Testing AI chat for user with transaction...');
    const res = await processChat(user.id, 'hello');
    console.log('Success:', res);
  } catch (e) {
    console.error('CRASH:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
