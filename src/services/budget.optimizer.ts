/**
 * Budget optimization and recommendation engine.
 */

export interface BudgetAnalysis {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  spentPercent: number;
  status: 'over' | 'warning' | 'on-track' | 'under';
  remainingAmount: number;
  emoji: string;
}

export interface BudgetRecommendation {
  type: 'needs' | 'wants' | 'savings';
  recommended: number;
  actual: number;
  difference: number;
  categories: string[];
}

export interface SavingsOpportunity {
  category: string;
  currentSpend: number;
  suggestedCut: number;
  monthlySavings: number;
  annualSavings: number;
  reason: string;
  emoji: string;
}

export function analyzeBudgetHealth(budgets: any[]): BudgetAnalysis[] {
  return budgets.map((b) => {
    const spentAmount = b.spentAmount || 0;
    const budgetAmount = b.budgetAmount || 1; // avoid division by zero
    const spentPercent = (spentAmount / budgetAmount) * 100;
    
    let status: BudgetAnalysis['status'] = 'under';
    if (spentPercent >= 100) {
      status = 'over';
    } else if (spentPercent >= 80) {
      status = 'warning';
    } else if (spentPercent >= 50) {
      status = 'on-track';
    }

    return {
      category: b.category,
      budgetAmount: b.budgetAmount,
      spentAmount: b.spentAmount,
      spentPercent,
      status,
      remainingAmount: b.budgetAmount - b.spentAmount,
      emoji: b.emoji || ''
    };
  });
}

export function recommend50_30_20(
  monthlyIncome: number,
  currentSpending: { category: string; amount: number }[]
): BudgetRecommendation[] {
  const needsCategories = ['Housing', 'Utilities', 'Groceries', 'Transport', 'Health', 'Education', 'EMI'];
  const wantsCategories = ['Food & Dining', 'Shopping', 'Entertainment', 'Travel', 'Personal Care'];
  
  let needsActual = 0;
  let wantsActual = 0;
  let savingsActual = 0;

  const needsList: string[] = [];
  const wantsList: string[] = [];

  let totalSpent = 0;
  for (const s of currentSpending) {
    totalSpent += s.amount;
    if (needsCategories.includes(s.category)) {
      needsActual += s.amount;
      needsList.push(s.category);
    } else if (wantsCategories.includes(s.category)) {
      wantsActual += s.amount;
      wantsList.push(s.category);
    } else {
      wantsActual += s.amount;
      wantsList.push(s.category);
    }
  }

  savingsActual = monthlyIncome > totalSpent ? monthlyIncome - totalSpent : 0;

  const needsRecommended = monthlyIncome * 0.5;
  const wantsRecommended = monthlyIncome * 0.3;
  const savingsRecommended = monthlyIncome * 0.2;

  return [
    {
      type: 'needs',
      recommended: needsRecommended,
      actual: needsActual,
      difference: needsActual - needsRecommended,
      categories: Array.from(new Set(needsList)),
    },
    {
      type: 'wants',
      recommended: wantsRecommended,
      actual: wantsActual,
      difference: wantsActual - wantsRecommended,
      categories: Array.from(new Set(wantsList)),
    },
    {
      type: 'savings',
      recommended: savingsRecommended,
      actual: savingsActual,
      difference: savingsActual - savingsRecommended,
      categories: ['Savings', 'Investments'],
    }
  ];
}

export function suggestCuts(
  anomalies: any[],
  topCategories: any[],
  budgets: any[]
): SavingsOpportunity[] {
  const opportunities: SavingsOpportunity[] = [];
  const processedCategories = new Set<string>();

  const addOp = (cat: string, currentSpend: number, percentageCut: number, reason: string, emoji: string) => {
    if (processedCategories.has(cat)) return;
    const suggestedCut = currentSpend * percentageCut;
    opportunities.push({
      category: cat,
      currentSpend,
      suggestedCut,
      monthlySavings: suggestedCut,
      annualSavings: suggestedCut * 12,
      reason,
      emoji
    });
    processedCategories.add(cat);
  };

  // 1. Over budget categories
  for (const b of budgets) {
    if (b.spentAmount > b.budgetAmount) {
      addOp(
        b.category,
        b.spentAmount,
        (b.spentAmount - b.budgetAmount) / b.spentAmount,
        `Over budget by ₹${b.spentAmount - b.budgetAmount}`,
        b.emoji || '⚠️'
      );
    }
  }

  // 2. Anomalies
  for (const a of anomalies) {
    if (!processedCategories.has(a.category)) {
      addOp(
        a.category,
        a.amount,
        0.15, // Suggest 15% cut on anomalies
        `Unusual spending detected: ₹${a.amount}`,
        '👀'
      );
    }
  }

  // 3. Top categories (if they are discretionary wants)
  const wants = ['Food & Dining', 'Shopping', 'Entertainment'];
  for (const tc of topCategories) {
    if (wants.includes(tc.category) && !processedCategories.has(tc.category)) {
      addOp(
        tc.category,
        tc.amount,
        0.10, // 10% cut on large discretionary spends
        `High spend in discretionary category. A 10% cut helps.`,
        '✂️'
      );
    }
  }

  return opportunities.sort((a, b) => b.monthlySavings - a.monthlySavings);
}

export function calculatePotentialSavings(opportunities: SavingsOpportunity[]): { monthly: number; annual: number } {
  return opportunities.reduce((acc, curr) => ({
    monthly: acc.monthly + curr.monthlySavings,
    annual: acc.annual + curr.annualSavings
  }), { monthly: 0, annual: 0 });
}
