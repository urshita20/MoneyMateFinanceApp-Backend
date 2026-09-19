import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Demo User
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@moneymate.com' },
    update: {},
    create: {
      email: 'demo@moneymate.com',
      name: 'Alex Johnson',
      password: hashedPassword,
      profileMode: 'adult',
    },
  });

  console.log(`👤 Demo User created: ${user.email}`);

  // 2. Create Accounts
  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.account.createMany({
    data: [
      { name: 'HDFC Salary Account', type: 'bank', balance: 142500, currency: 'INR', userId: user.id },
      { name: 'ICICI Credit Card', type: 'credit', balance: -18500, currency: 'INR', userId: user.id },
      { name: 'Cash Wallet', type: 'cash', balance: 4500, currency: 'INR', userId: user.id },
      { name: 'Zerodha Mutual Funds', type: 'investment', balance: 350000, currency: 'INR', userId: user.id },
    ],
  });

  // 3. Create Categories
  await prisma.category.deleteMany({});
  await prisma.category.createMany({
    data: [
      { name: 'Food & Dining', emoji: '🍕', color: '#F97316', type: 'expense' },
      { name: 'Housing', emoji: '🏠', color: '#6366F1', type: 'expense' },
      { name: 'Transport', emoji: '🚗', color: '#3B82F6', type: 'expense' },
      { name: 'Shopping', emoji: '🛍️', color: '#EC4899', type: 'expense' },
      { name: 'Entertainment', emoji: '🎬', color: '#8B5CF6', type: 'expense' },
      { name: 'Health', emoji: '💊', color: '#10B981', type: 'expense' },
      { name: 'Utilities', emoji: '⚡', color: '#F59E0B', type: 'expense' },
      { name: 'Salary', emoji: '💰', color: '#10B981', type: 'income' },
      { name: 'Investment Returns', emoji: '📈', color: '#3B82F6', type: 'income' },
    ],
  });

  // 4. Create Transactions
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.createMany({
    data: [
      { merchant: 'Swiggy', category: 'Food & Dining', amount: 450, date: 'Jul 18', emoji: '🍕', type: 'expense', userId: user.id },
      { merchant: 'HDFC Salary', category: 'Salary', amount: 85000, date: 'Jul 1', emoji: '💰', type: 'income', userId: user.id },
      { merchant: 'Uber', category: 'Transport', amount: 280, date: 'Jul 17', emoji: '🚗', type: 'expense', userId: user.id },
      { merchant: 'Amazon', category: 'Shopping', amount: 2340, date: 'Jul 16', emoji: '🛍️', type: 'expense', userId: user.id },
      { merchant: 'Netflix', category: 'Entertainment', amount: 649, date: 'Jul 15', emoji: '🎬', type: 'expense', userId: user.id },
      { merchant: 'Apollo Pharmacy', category: 'Health', amount: 890, date: 'Jul 14', emoji: '💊', type: 'expense', userId: user.id },
      { merchant: 'Zomato', category: 'Food & Dining', amount: 320, date: 'Jul 13', emoji: '🍔', type: 'expense', userId: user.id },
      { merchant: 'BPCL Petrol', category: 'Transport', amount: 2500, date: 'Jul 12', emoji: '⛽', type: 'expense', userId: user.id },
    ],
  });

  // 5. Create Budgets
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.budget.createMany({
    data: [
      { category: 'Food & Dining', budgetAmount: 15000, spentAmount: 12400, emoji: '🍕', color: '#F97316', month: 'Jul 2026', userId: user.id },
      { category: 'Transport', budgetAmount: 6000, spentAmount: 4200, emoji: '🚗', color: '#3B82F6', month: 'Jul 2026', userId: user.id },
      { category: 'Shopping', budgetAmount: 10000, spentAmount: 8900, emoji: '🛍️', color: '#EC4899', month: 'Jul 2026', userId: user.id },
      { category: 'Entertainment', budgetAmount: 3000, spentAmount: 3200, emoji: '🎬', color: '#8B5CF6', month: 'Jul 2026', userId: user.id },
      { category: 'Health', budgetAmount: 5000, spentAmount: 1890, emoji: '💊', color: '#10B981', month: 'Jul 2026', userId: user.id },
      { category: 'Utilities', budgetAmount: 4000, spentAmount: 3100, emoji: '⚡', color: '#F59E0B', month: 'Jul 2026', userId: user.id },
    ],
  });

  // 6. Create Goals
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.goal.createMany({
    data: [
      { name: 'Emergency Fund', targetAmount: 300000, savedAmount: 145000, emoji: '🛡️', color: 'emerald', deadline: 'Dec 2025', aiDate: 'Nov 2025', userId: user.id },
      { name: 'Goa Vacation', targetAmount: 50000, savedAmount: 32000, emoji: '✈️', color: 'blue', deadline: 'Mar 2026', aiDate: 'Feb 2026', userId: user.id },
      { name: 'MacBook Pro', targetAmount: 180000, savedAmount: 75000, emoji: '💻', color: 'slate', deadline: 'Jun 2026', aiDate: 'May 2026', userId: user.id },
      { name: 'New Car', targetAmount: 800000, savedAmount: 120000, emoji: '🚗', color: 'amber', deadline: 'Jan 2027', aiDate: 'Mar 2027', userId: user.id },
    ],
  });

  // 7. Create Bills
  await prisma.bill.deleteMany({ where: { userId: user.id } });
  await prisma.bill.createMany({
    data: [
      { name: 'Rent', amount: 25000, dueDate: 'Jul 25', status: 'upcoming', emoji: '🏠', recurring: true, userId: user.id },
      { name: 'Electricity', amount: 1850, dueDate: 'Jul 20', status: 'due-soon', emoji: '⚡', recurring: true, userId: user.id },
      { name: 'Internet', amount: 1499, dueDate: 'Jul 19', status: 'due-today', emoji: '📶', recurring: true, userId: user.id },
      { name: 'Gym', amount: 2500, dueDate: 'Aug 1', status: 'upcoming', emoji: '💪', recurring: true, userId: user.id },
      { name: 'Netflix', amount: 649, dueDate: 'Jul 28', status: 'upcoming', emoji: '🎬', recurring: true, userId: user.id },
      { name: 'Credit Card', amount: 18500, dueDate: 'Jul 15', status: 'paid', emoji: '💳', recurring: false, userId: user.id },
    ],
  });

  // 8. Create Investments & Loans
  await prisma.investment.deleteMany({ where: { userId: user.id } });
  await prisma.investment.createMany({
    data: [
      { assetName: 'Nifty 50 Index Fund SIP', type: 'SIP', investedAmount: 120000, currentValue: 148500, returnsPercent: 23.75, userId: user.id },
      { assetName: 'Tata Motors Shares', type: 'Stock', investedAmount: 50000, currentValue: 67200, returnsPercent: 34.4, userId: user.id },
      { assetName: 'HDFC Fixed Deposit', type: 'FD', investedAmount: 100000, currentValue: 107100, returnsPercent: 7.1, userId: user.id },
    ],
  });

  await prisma.loan.deleteMany({ where: { userId: user.id } });
  await prisma.loan.createMany({
    data: [
      { title: 'Home Loan', lender: 'SBI', totalAmount: 4000000, remainingAmount: 3200000, interestRate: 8.5, emi: 34500, dueDate: '5th of month', userId: user.id },
      { title: 'Car Loan', lender: 'HDFC Bank', totalAmount: 600000, remainingAmount: 240000, interestRate: 9.2, emi: 14200, dueDate: '10th of month', userId: user.id },
    ],
  });

  // 9. Create Knowledge Articles
  await prisma.knowledgeArticle.deleteMany({});
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

  // 10. Create Junior Quests
  await prisma.juniorQuest.deleteMany({ where: { userId: user.id } });
  await prisma.juniorQuest.createMany({
    data: [
      { title: 'Save ₹50 from weekly allowance', rewardCoins: 50, completed: true, streakCount: 3, userId: user.id },
      { title: 'Log 3 daily expenses accurately', rewardCoins: 30, completed: false, streakCount: 1, userId: user.id },
      { title: 'Complete Financial Literacy Quiz', rewardCoins: 100, completed: false, streakCount: 0, userId: user.id },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
