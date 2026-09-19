import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'moneymate_super_secret_jwt_key_2026';
}

console.log('🔧 Starting MoneyMate Backend with DATABASE_URL:', process.env.DATABASE_URL);

await import('./server.js');
