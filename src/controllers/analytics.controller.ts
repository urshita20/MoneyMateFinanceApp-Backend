import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.json({ success: false, message: 'User not found' });
    }

    const accounts = await prisma.account.findMany({ where: { userId: targetUserId } });
    const transactions = await prisma.transaction.findMany({ where: { userId: targetUserId } });
    const budgets = await prisma.budget.findMany({ where: { userId: targetUserId } });

    const totalAssetBalance = accounts
      .filter((a) => a.balance > 0)
      .reduce((acc, a) => acc + a.balance, 0);

    const totalLiabilityBalance = accounts
      .filter((a) => a.balance < 0)
      .reduce((acc, a) => acc + Math.abs(a.balance), 0);

    const netWorth = totalAssetBalance - totalLiabilityBalance;

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    // Calculate Financial Health Score (0-100)
    const savingsRatio = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0.2;
    const healthScore = Math.min(100, Math.max(30, Math.round(50 + savingsRatio * 40)));

    return res.json({
      success: true,
      summary: {
        netWorth,
        totalAssets: totalAssetBalance,
        totalLiabilities: totalLiabilityBalance,
        monthlyIncome: totalIncome || 85000,
        monthlyExpense: totalExpense || 52340,
        healthScore,
        activeAccountsCount: accounts.length,
        budgetsTrackedCount: budgets.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSpendingByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    const defaultData = [
      { name: 'Food', value: 28, color: '#F97316' },
      { name: 'Housing', value: 22, color: '#6366F1' },
      { name: 'Transport', value: 15, color: '#3B82F6' },
      { name: 'Shopping', value: 18, color: '#EC4899' },
      { name: 'Entertainment', value: 8, color: '#8B5CF6' },
      { name: 'Others', value: 9, color: '#64748B' },
    ];

    if (!targetUserId) {
      return res.json({ success: true, categories: defaultData });
    }

    const budgets = await prisma.budget.findMany({ where: { userId: targetUserId } });
    if (budgets.length === 0) {
      return res.json({ success: true, categories: defaultData });
    }

    const totalSpent = budgets.reduce((acc, b) => acc + b.spentAmount, 0) || 1;
    const categories = budgets.map((b) => ({
      name: b.category,
      value: Math.round((b.spentAmount / totalSpent) * 100),
      color: b.color,
    }));

    return res.json({ success: true, categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyTrends = async (req: AuthRequest, res: Response) => {
  try {
    const monthlyData = [
      { month: 'Feb', income: 82000, expense: 48000 },
      { month: 'Mar', income: 85000, expense: 53000 },
      { month: 'Apr', income: 85000, expense: 49000 },
      { month: 'May', income: 87000, expense: 56000 },
      { month: 'Jun', income: 85000, expense: 51000 },
      { month: 'Jul', income: 85000, expense: 52340 },
    ];

    return res.json({ success: true, monthlyData });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWeeklyTrends = async (req: AuthRequest, res: Response) => {
  try {
    const weeklyTrend = [
      { day: 'Mon', amount: 1200 },
      { day: 'Tue', amount: 3400 },
      { day: 'Wed', amount: 890 },
      { day: 'Thu', amount: 2100 },
      { day: 'Fri', amount: 4500 },
      { day: 'Sat', amount: 6800 },
      { day: 'Sun', amount: 2300 },
    ];

    return res.json({ success: true, weeklyTrend });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
