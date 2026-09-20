import dotenv from 'dotenv';
import fs from 'fs';

// Guaranteed fallback environment variables
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  process.env.DATABASE_URL = 'file:./dev.db';
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  process.env.JWT_SECRET = 'moneymate_super_secret_jwt_key_2026';
}

if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else if (fs.existsSync('.env.default')) {
  dotenv.config({ path: '.env.default' });
} else {
  dotenv.config();
}

// Re-verify after dotenv load
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  process.env.DATABASE_URL = 'file:./dev.db';
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  process.env.JWT_SECRET = 'moneymate_super_secret_jwt_key_2026';
}
