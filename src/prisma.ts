import './env.js';
import { PrismaClient } from './generated/client/index.js';
import fs from 'fs';
import path from 'path';

let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const candidates = [
      path.resolve(process.cwd(), 'dev.db'),
      path.resolve(process.cwd(), 'prisma/dev.db'),
      path.resolve(process.cwd(), '../dev.db'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          fs.copyFileSync(candidate, tmpDbPath);
          console.log(`✅ Copied initial database from ${candidate} to ${tmpDbPath}`);
          break;
        } catch (err) {
          console.error(`Failed copying ${candidate} to /tmp:`, err);
        }
      }
    }
  }
  dbUrl = 'file:/tmp/dev.db';
} else if (!dbUrl.startsWith('file:')) {
  // ensure valid SQLite path format
  const localDbPath = path.resolve(process.cwd(), 'dev.db');
  dbUrl = `file:${localDbPath}`;
}

// Ensure process.env.DATABASE_URL matches dbUrl for Prisma internal env validator
process.env.DATABASE_URL = dbUrl;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
