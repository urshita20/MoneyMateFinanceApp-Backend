import './env.js';
import { PrismaClient } from './generated/client/index.js';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});




