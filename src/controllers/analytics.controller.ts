import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({
        success: true,
        hasData: false,
        summary: {
          totalBalance: 0,
          monthlyIncome: 0,
          monthlyExpense: 0,
          savings: 0,
          monthlyBudget: 0,
          healthScore: null,
          healthFactors: null,
          transactionCount: 0,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyIncome: true, monthlyBudget: true, savingsTarget: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const hasData = transactions.length > 0 || (user?.monthlyIncome || 0) > 0;

    // Filter current month transactions
    const now = new Date();
    const currentMonthPrefix = now.toLocaleString('en-US', { month: 'short' }); // e.g. "Sep" or "Jul"

    const totalIncomeTx = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpenseTx = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const userIncome = (user?.monthlyIncome || 0) > 0 ? user!.monthlyIncome! : totalIncomeTx;
    const userBudget = user?.monthlyBudget || 0;
    const monthlyExpense = totalExpenseTx;
    const savings = userIncome - monthlyExpense;
    const totalBalance = userIncome + totalIncomeTx - totalExpenseTx;

    // Health Score calculation (strictly from real data)
    let healthScore: number | null = null;
    let healthFactors: any = null;

    if (transactions.length > 0 && userIncome > 0) {
      // 1. Savings Rate Factor (Max 30)
      const savingsRate = Math.max(0, savings / userIncome);
      const savingsScore = Math.min(30, Math.round(savingsRate * 100 * 0.5));

      // 2. Budget Discipline Factor (Max 30)
      let budgetScore = 20;
      if (userBudget > 0) {
        const budgetRatio = monthlyExpense / userBudget;
        if (budgetRatio <= 0.8) budgetScore = 30;
        else if (budgetRatio <= 1.0) budgetScore = 22;
        else if (budgetRatio <= 1.2) budgetScore = 12;
        else budgetScore = 5;
      }

      // 3. Overspending Frequency Factor (Max 20)
      const overspentCount = transactions.filter(t => t.type === 'expense' && t.amount > (userIncome * 0.3)).length;
      const overspendingScore = Math.max(5, 20 - (overspentCount * 5));

      // 4. Category Diversification (Max 20)
      const categoriesUsed = new Set(transactions.map(t => t.category)).size;
      const categoryScore = Math.min(20, categoriesUsed * 5);

      healthScore = Math.min(100, savingsScore + budgetScore + overspendingScore + categoryScore);

      healthFactors = {
        savingsDiscipline: savingsScore >= 20 ? 'Good' : savingsScore >= 10 ? 'Moderate' : 'Needs Work',
        budgetAdherence: budgetScore >= 22 ? 'Good' : budgetScore >= 12 ? 'Moderate' : 'Over Budget',
        overspendingRisk: overspendingScore >= 15 ? 'Low' : 'High',
        spendingConsistency: categoryScore >= 15 ? 'Balanced' : 'Concentrated',
      };
    }

    return res.json({
      success: true,
      hasData,
      summary: {
        totalBalance: Math.max(0, totalBalance),
        monthlyIncome: userIncome,
        monthlyExpense,
        savings,
        monthlyBudget: userBudget,
        savingsTarget: user?.savingsTarget || 0,
        healthScore,
        healthFactors,
        transactionCount: transactions.length,
        recentTransactions: transactions.slice(0, 5),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSpendingByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, hasData: false, categories: [] });
    }

    const expenseTransactions = await prisma.transaction.findMany({
      where: { userId, type: 'expense' },
    });

    if (expenseTransactions.length === 0) {
      return res.json({ success: true, hasData: false, categories: [] });
    }

    const totalSpent = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Group by category
    const categoryMap: { [key: string]: number } = {};
    for (const tx of expenseTransactions) {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    }

    const categoryColors: { [key: string]: string } = {
      'Food & Dining': '#F97316',
      'Housing': '#6366F1',
      'Transport': '#3B82F6',
      'Shopping': '#EC4899',
      'Entertainment': '#8B5CF6',
      'Health': '#10B981',
      'Utilities': '#F59E0B',
      'Groceries': '#10B981',
      'Education': '#6366F1',
      'Other': '#64748B',
    };

    const categories = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      amount: categoryMap[cat],
      value: Math.round((categoryMap[cat] / totalSpent) * 100),
      color: categoryColors[cat] || '#64748B',
    }));

    return res.json({ success: true, hasData: true, totalSpent, categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyTrends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, hasData: false, monthlyData: [] });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length === 0) {
      return res.json({ success: true, hasData: false, monthlyData: [] });
    }

    // Group transactions by Month (e.g., "Jul", "Aug", "Sep")
    const monthMap: { [key: string]: { income: number; expense: number } } = {};

    for (const tx of transactions) {
      const monthStr = tx.date.split(' ')[0] || new Date(tx.createdAt).toLocaleString('en-US', { month: 'short' });
      if (!monthMap[monthStr]) {
        monthMap[monthStr] = { income: 0, expense: 0 };
      }
      if (tx.type === 'income') {
        monthMap[monthStr].income += tx.amount;
      } else {
        monthMap[monthStr].expense += tx.amount;
      }
    }

    const monthlyData = Object.keys(monthMap).map(m => ({
      month: m,
      income: monthMap[m].income,
      expense: monthMap[m].expense,
    }));

    return res.json({ success: true, hasData: true, monthlyData });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWeeklyTrends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, hasData: false, weeklyTrend: [] });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId, type: 'expense' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (transactions.length === 0) {
      return res.json({ success: true, hasData: false, weeklyTrend: [] });
    }

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap: { [key: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    for (const tx of transactions) {
      const txDate = new Date(tx.createdAt);
      const dayName = daysOfWeek[txDate.getDay()];
      if (dayMap[dayName] !== undefined) {
        dayMap[dayName] += tx.amount;
      }
    }

    const weeklyTrend = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      amount: dayMap[day],
    }));

    return res.json({ success: true, hasData: true, weeklyTrend });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimeMachineAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({
        success: true,
        hasEnoughData: false,
        message: 'Time Machine needs more financial history. Keep tracking your spending and we will start identifying your patterns.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length < 3) {
      return res.json({
        success: true,
        hasEnoughData: false,
        message: 'Time Machine needs at least 3 transactions to analyze your financial history.',
        transactionCount: transactions.length,
      });
    }

    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const totalSpent = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

    // Calculate category Breakdown
    const catMap: { [key: string]: number } = {};
    for (const t of expenseTxs) {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    }

    let topCategory = 'None';
    let topCatAmount = 0;
    for (const cat in catMap) {
      if (catMap[cat] > topCatAmount) {
        topCatAmount = catMap[cat];
        topCategory = cat;
      }
    }

    const avgExpense = Math.round(totalSpent / Math.max(1, expenseTxs.length));
    const userIncome = user?.monthlyIncome || 0;
    const monthlyBudget = user?.monthlyBudget || 0;

    return res.json({
      success: true,
      hasEnoughData: true,
      insights: {
        totalTrackedExpenses: totalSpent,
        averageExpensePerTransaction: avgExpense,
        topSpendingCategory: topCategory,
        topCategorySpent: topCatAmount,
        projectedMonthlySpend: Math.round(totalSpent * 1.1),
        budgetStatus: monthlyBudget > 0 && totalSpent > monthlyBudget ? 'Over Budget Risk' : 'Within Expected Limits',
        historicalFact: `Based on your ${transactions.length} recorded transactions, your top category is ${topCategory} (₹${topCatAmount.toLocaleString('en-IN')}).`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
