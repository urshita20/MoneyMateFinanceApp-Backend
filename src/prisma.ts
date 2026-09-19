import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
process.env.DATABASE_URL = dbUrl;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
