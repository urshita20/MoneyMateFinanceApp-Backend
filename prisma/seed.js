import '../src/env.js';
import { PrismaClient } from '../src/generated/client/index.js';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log('🌱 Starting clean database seed...');

  // Create standard categories if not exist
  const existingCategories = await prisma.category.count();
  if (existingCategories === 0) {
    await prisma.category.createMany({
      data: [
        { name: 'Food & Dining', emoji: '🍕', color: '#F97316', type: 'expense' },
        { name: 'Housing', emoji: '🏠', color: '#6366F1', type: 'expense' },
        { name: 'Transport', emoji: '🚗', color: '#3B82F6', type: 'expense' },
        { name: 'Shopping', emoji: '🛍️', color: '#EC4899', type: 'expense' },
        { name: 'Entertainment', emoji: '🎬', color: '#8B5CF6', type: 'expense' },
        { name: 'Health', emoji: '💊', color: '#10B981', type: 'expense' },
        { name: 'Utilities', emoji: '⚡', color: '#F59E0B', type: 'expense' },
        { name: 'Groceries', emoji: '🛒', color: '#10B981', type: 'expense' },
        { name: 'Education', emoji: '📚', color: '#6366F1', type: 'expense' },
        { name: 'Salary', emoji: '💰', color: '#10B981', type: 'income' },
        { name: 'Freelance', emoji: '💻', color: '#3B82F6', type: 'income' },
        { name: 'Investment Returns', emoji: '📈', color: '#8B5CF6', type: 'income' },
        { name: 'Other', emoji: '📦', color: '#64748B', type: 'expense' },
      ],
    });
    console.log('✅ Standard categories created!');
  }

  // Create Knowledge Articles if not exist
  const existingArticles = await prisma.knowledgeArticle.count();
  if (existingArticles === 0) {
    await prisma.knowledgeArticle.createMany({
      data: [
        {
          title: 'Understanding Income Tax Slabs for FY 2024-25',
          category: 'Tax',
          summary: 'Learn about the new tax regime vs old tax regime and which one suits you better based on your income and deductions.',
          readTime: '5 min',
          color: 'blue',
        },
        {
          title: "RBI's Monetary Policy and How It Affects You",
          category: 'RBI',
          summary: "A deep dive into how the Reserve Bank of India's repo rate decisions impact home loans, FDs, and everyday banking.",
          readTime: '7 min',
          color: 'emerald',
        },
        {
          title: "Mutual Fund SIP vs Lump Sum: What's Better?",
          category: 'Investments',
          summary: 'Systematic Investment Plans vs lump sum investments — a comprehensive comparison to help you choose the right approach.',
          readTime: '6 min',
          color: 'purple',
        },
        {
          title: 'PM Jan Dhan Yojana Benefits You Should Know',
          category: 'Government Schemes',
          summary: 'Complete guide to benefits, eligibility, and how to access services under the Pradhan Mantri Jan Dhan Yojana scheme.',
          readTime: '4 min',
          color: 'amber',
        },
      ],
    });
    console.log('✅ Knowledge articles created!');
  }

  console.log('✅ Seed completed cleanly without any demo data!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
