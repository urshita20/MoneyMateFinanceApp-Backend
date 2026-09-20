import { PrismaClient } from './src/generated/client/index.js';
import { processChat } from './src/services/ai.engine.js';

const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: { contains: 'shreyanshi' } }
    });

    if (!user) {
      console.log('User not found in local dev.db');
      return;
    }

    console.log('Testing AI chat for user:', user.email);
    const res = await processChat(user.id, 'hello');
    console.log('Success:', res);
  } catch (e) {
    console.error('CRASH:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
