import './env.js';
import { PrismaClient } from './generated/client/index.js';
import fs from 'fs';
import path from 'path';

let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const candidate = path.resolve(process.cwd(), 'dev.db');
    if (fs.existsSync(candidate)) {
      try {
        fs.copyFileSync(candidate, tmpDbPath);
        console.log(`✅ Copied seeded database to ${tmpDbPath}`);
      } catch (err) {
        console.error('Failed copying db to /tmp:', err);
      }
    }
  }
  dbUrl = 'file:/tmp/dev.db';
} else {
  const localDbPath = path.resolve(process.cwd(), 'dev.db');
  dbUrl = `file:${localDbPath}`;
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
