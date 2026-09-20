import { getUserFinancialSnapshot } from './data.aggregator.js';
import type { FinancialSnapshot } from './data.aggregator.js';
import { getTopCategories, detectAnomalies, getSpendingVelocity, getTopMerchants, detectRecurringExpenses, getWeekdayPatterns } from './spending.analyzer.js';
import { forecastMonthlySpending, generateWeeklyForecast, projectGoalCompletion, calculateSavingsPrediction, getSpendingTrend } from './forecast.engine.js';
import { analyzeBudgetHealth, recommend50_30_20, suggestCuts, calculatePotentialSavings } from './budget.optimizer.js';
import { classifyIntent } from './intent.classifier.js';
import { generateChatReply, generateInsightItems, generateDashboardPayload } from './response.generator.js';
import type { AIResponse, InsightItem, DashboardData } from './response.generator.js';

/**
 * Helper: Build monthly totals from 6-month transaction history
 */
function buildMonthlyTotals(transactions: any[]): { month: string; total: number }[] {
  const monthMap = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const d = new Date(t.createdAt);
    const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthMap.set(key, (monthMap.get(key) || 0) + t.amount);
  }

  return Array.from(monthMap.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => {
      // Parse month strings for sorting
      const da = new Date(a.month);
      const db = new Date(b.month);
      return da.getTime() - db.getTime();
    });
}

/**
 * Helper: Get current month's total expenses
 */
function getTotalExpenses(transactions: any[]): number {
  return transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0);
}

/**
 * Process a chat message from a user, orchestrating intent classification,
 * data aggregation, and response generation.
 */
export async function processChat(userId: string, message: string): Promise<AIResponse> {
  try {
    // 1. Classify the intent
    const intentResult = classifyIntent(message);

    // 2. Fetch user's financial snapshot
    const snapshot = await getUserFinancialSnapshot(userId);

    // 3. Build context data for the response generator
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Pre-compute common analyses
    const topCategories = getTopCategories(snapshot.currentMonthTransactions);
    const anomalies = detectAnomalies(snapshot.currentMonthTransactions, snapshot.lastMonthTransactions);
    const budgetHealth = analyzeBudgetHealth(snapshot.budgets);
    const monthlyBudget = snapshot.user.monthlyBudget || 50000;
    const velocity = getSpendingVelocity(snapshot.currentMonthTransactions, monthlyBudget, dayOfMonth, daysInMonth);

    // Attach context data to snapshot for the response generator
    const enrichedSnapshot = {
      ...snapshot,
      topCategories,
      anomalies,
      budgetHealth,
      velocity,
      totalExpenses: getTotalExpenses(snapshot.currentMonthTransactions),
    };

    // 4. Check chat history for multi-turn context
    if (snapshot.chatHistory && snapshot.chatHistory.length > 0 && intentResult.intent === 'UNKNOWN') {
      // If user sends a vague follow-up, try to use last assistant context
      const lastAssistantMsg = [...snapshot.chatHistory].reverse().find((m: any) => m.role === 'assistant');
      if (lastAssistantMsg) {
        // Simple heuristic: check if user says "tell me more", "yes", "details"
        const lower = message.toLowerCase();
        if (lower.includes('more') || lower.includes('yes') || lower.includes('detail') || lower.includes('explain')) {
          // Re-classify based on the last assistant message topic
          const reClassified = classifyIntent(lastAssistantMsg.content);
          if (reClassified.intent !== 'UNKNOWN') {
            return await generateChatReply(reClassified.intent, enrichedSnapshot, intentResult.entities);
          }
        }
      }
    }

    // 5. Generate response using intent and real data
    return await generateChatReply(intentResult.intent, enrichedSnapshot, intentResult.entities);
  } catch (error: any) {
    console.error('Error in processChat:', error);
    return {
      reply: `MATH CRASH DEBUG:\n\n${error.message}\n\n${error.stack}`,
      tone: 'info' as const,
      followUp: 'Please show this screenshot to the dev.',
      actionLabel: null,
    };
  }
}

/**
 * Generate actionable insights for a user based on their current financial data.
 */
export async function getInsights(userId: string): Promise<InsightItem[]> {
  try {
    // 1. Fetch financial snapshot
    const snapshot = await getUserFinancialSnapshot(userId);

    // 2. Run all analyzers
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthlyBudget = snapshot.user.monthlyBudget || 50000;

    const topCategories = getTopCategories(snapshot.currentMonthTransactions);
    const anomalies = detectAnomalies(snapshot.currentMonthTransactions, snapshot.lastMonthTransactions);
    const budgetHealth = analyzeBudgetHealth(snapshot.budgets);
    const velocity = getSpendingVelocity(snapshot.currentMonthTransactions, monthlyBudget, dayOfMonth, daysInMonth);
    const recurring = detectRecurringExpenses(snapshot.currentMonthTransactions);

    // 3. Get spending trend from monthly totals
    const monthlyTotals = buildMonthlyTotals(snapshot.sixMonthTransactions);
    const trend = getSpendingTrend(monthlyTotals);

    // 4. Generate insight items (signature: snapshot, anomalies, budgetAnalysis, forecastTrend)
    const enrichedSnapshot = {
      ...snapshot,
      topCategories,
      velocity,
      recurring,
      totalExpenses: getTotalExpenses(snapshot.currentMonthTransactions),
    };
    const insights = await generateInsightItems(enrichedSnapshot, anomalies, budgetHealth, trend);

    // 5. Return sorted by priority
    return insights;
  } catch (error) {
    console.error('Error in getInsights:', error);
    return [
      {
        id: 'default-1',
        title: 'Track Your Spending',
        type: 'tip',
        description: 'Start logging your expenses regularly to get personalized AI insights and savings tips.',
        icon: '📊',
        actionLabel: 'Add Transaction',
        priority: 1,
      },
    ];
  }
}

/**
 * Generate a complete set of dashboard data for a user.
 */
export async function getDashboard(userId: string): Promise<DashboardData> {
  try {
    // 1. Fetch financial snapshot
    const snapshot = await getUserFinancialSnapshot(userId);

    // 2. Build monthly totals from 6-month history
    const monthlyTotals = buildMonthlyTotals(snapshot.sixMonthTransactions);
    const monthlyIncome = snapshot.user.monthlyIncome || 50000;

    // 3. Run forecasters
    const forecast = forecastMonthlySpending(monthlyTotals, monthlyIncome);

    // 4. Weekly forecast
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weeklyTxns = snapshot.currentMonthTransactions.map((t: any) => ({
      amount: t.amount,
      date: new Date(t.createdAt),
    }));
    const weekly = generateWeeklyForecast(weeklyTxns, daysInMonth);

    // 5. Savings prediction
    const totalExpenses = getTotalExpenses(snapshot.currentMonthTransactions);
    const savingsPrediction = calculateSavingsPrediction(monthlyIncome, totalExpenses);

    // 6. Run analyzers
    const anomalies = detectAnomalies(snapshot.currentMonthTransactions, snapshot.lastMonthTransactions);
    const budgetHealth = analyzeBudgetHealth(snapshot.budgets);

    // 7. Build enriched snapshot
    const enrichedSnapshot = {
      ...snapshot,
      expensesTotal: totalExpenses,
    };

    // 8. Build complete dashboard (signature: snapshot, weeklyForecast, savingsPrediction, anomalies, budgetAnalysis)
    return await generateDashboardPayload(enrichedSnapshot, weekly, savingsPrediction, anomalies, budgetHealth);
  } catch (error) {
    console.error('Error in getDashboard:', error);
    return {
      summary: {
        text: 'Unable to load dashboard data. Please try again later.',
        income: 0,
        expenses: 0,
        savings: 0,
        healthScore: 0,
      },
      spendingForecast: [],
      savingsPrediction: [],
      categoryInsights: [],
      upcomingBills: [],
      tips: [],
    };
  }
}
