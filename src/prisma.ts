import './env.js';
import { PrismaClient } from './generated/client/index.js';
import fs from 'fs';
import path from 'path';

let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const candidates = [
      path.resolve(process.cwd(), 'dev.db'),
      path.resolve(process.cwd(), 'prisma/dev.db'),
      path.resolve(process.cwd(), '../dev.db'),
    ];
    let copied = false;
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, tmpDbPath);
          console.log(`✅ Copied seeded database from ${cand} to ${tmpDbPath}`);
          copied = true;
          break;
        } catch (err) {
          console.error(`Failed copying ${cand} to /tmp:`, err);
        }
      }
    }
    if (!copied) {
      console.log('⚠️ Seeded dev.db not found in candidates, Vercel will use empty /tmp/dev.db');
    }
  }
  dbUrl = 'file:/tmp/dev.db';
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
