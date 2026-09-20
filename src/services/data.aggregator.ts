import { prisma } from '../prisma.js';
import {
  Transaction,
  Budget,
  Goal,
  Bill,
  Investment,
  Loan,
  Account,
  AIChatHistory
} from '../generated/client/index.js';

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export interface FinancialSnapshot {
  user: { 
    id: string; 
    name: string; 
    monthlyIncome: number; 
    monthlyBudget: number; 
    savingsTarget: number;
  };
  currentMonthTransactions: Transaction[];
  lastMonthTransactions: Transaction[];
  sixMonthTransactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  bills: Bill[];
  investments: Investment[];
  loans: Loan[];
  accounts: Account[];
  chatHistory: ChatMessage[];
  computed: {
    currentMonthIncome: number;
    currentMonthExpenses: number;
    currentMonthSavings: number;
    lastMonthExpenses: number;
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalLoanRemaining: number;
    daysRemainingInMonth: number;
    dayOfMonth: number;
  };
}

/**
 * Fetches and pre-processes a user's complete financial data into a structured snapshot.
 * 
 * @param userId - The ID of the user to fetch the snapshot for.
 * @returns A promise resolving to the user's FinancialSnapshot.
 */
export async function getUserFinancialSnapshot(userId: string): Promise<FinancialSnapshot> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const now = new Date();
    
    // Dates calculation
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    
    const startOfSixMonthsAgo = new Date(currentYear, currentMonth - 6, 1);

    // Queries
    const [
      currentMonthTransactions,
      lastMonthTransactions,
      sixMonthTransactions,
      budgets,
      goals,
      bills,
      investments,
      loans,
      accounts,
      chatHistoryRaw
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, createdAt: { gte: startOfCurrentMonth } }
      }),
      prisma.transaction.findMany({
        where: { userId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }
      }),
      prisma.transaction.findMany({
        where: { userId, createdAt: { gte: startOfSixMonthsAgo } }
      }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.bill.findMany({ where: { userId } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.loan.findMany({ where: { userId } }),
      prisma.account.findMany({ where: { userId } }),
      // @ts-ignore: Prisma client casing might vary for AIChatHistory
      (prisma.aIChatHistory || prisma.aiChatHistory || prisma.aIChatHistory).findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }) as Promise<AIChatHistory[]>
    ]);

    // Compute derived values
    const currentMonthIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const currentMonthExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const currentMonthSavings = currentMonthIncome - currentMonthExpenses;

    const lastMonthExpenses = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalAccountBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalInvestmentValue = investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
    const totalLoanRemaining = loans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysRemainingInMonth = daysInMonth - dayOfMonth;

    const chatHistory: ChatMessage[] = chatHistoryRaw.map(c => ({
      id: c.id,
      role: c.role,
      content: c.content,
      createdAt: c.createdAt
    }));

    return {
      user: {
        id: user.id,
        name: user.name || 'Unknown User',
        monthlyIncome: user.monthlyIncome || 0,
        monthlyBudget: user.monthlyBudget || 0,
        savingsTarget: user.savingsTarget || 0
      },
      currentMonthTransactions,
      lastMonthTransactions,
      sixMonthTransactions,
      budgets,
      goals,
      bills,
      investments,
      loans,
      accounts,
      chatHistory,
      computed: {
        currentMonthIncome,
        currentMonthExpenses,
        currentMonthSavings,
        lastMonthExpenses,
        totalAccountBalance,
        totalInvestmentValue,
        totalLoanRemaining,
        daysRemainingInMonth,
        dayOfMonth
      }
    };

  } catch (error) {
    console.error('Error fetching financial snapshot for user:', userId, error);
    // Depending on requirements, we can rethrow or return a default empty snapshot.
    throw error;
  }
}
