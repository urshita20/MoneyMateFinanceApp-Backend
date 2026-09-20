export interface MonthlyForecast {
  month: string; // e.g. 'Oct 2026'
  predictedExpenses: number;
  predictedSavings: number;
  confidence: 'high' | 'medium' | 'low'; // high if 3+ months data, medium if 2, low if 1
}

export interface WeeklyForecast {
  week: string; // e.g. 'Week 1', 'Week 2'
  actual: number | null;
  forecast: number | null;
}

export interface GoalProjection {
  goalName: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  estimatedCompletionDate: string; // e.g. 'Mar 2027'
  monthsRemaining: number;
  onTrack: boolean; // true if will complete before deadline
  emoji: string;
}

/**
 * Forecasts monthly spending and savings based on past monthly totals.
 */
export function forecastMonthlySpending(
  monthlyTotals: { month: string; total: number }[],
  monthlyIncome: number,
  monthsAhead: number = 3
): MonthlyForecast[] {
  let predictedExpenses = 0;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  const n = monthlyTotals.length;
  if (n === 0) {
    predictedExpenses = 0; // Or reasonable default
  } else if (n === 1) {
    predictedExpenses = monthlyTotals[0].total;
    confidence = 'low';
  } else if (n === 2) {
    predictedExpenses = (monthlyTotals[0].total + monthlyTotals[1].total) / 2;
    confidence = 'medium';
  } else {
    // 3 or more: use last 3 months with weights
    const last3 = monthlyTotals.slice(-3); // Assuming chronologically sorted
    predictedExpenses =
      last3[2].total * 0.5 + last3[1].total * 0.3 + last3[0].total * 0.2;
    confidence = 'high';
  }

  const results: MonthlyForecast[] = [];
  const currentDate = new Date(); // Current date as baseline for next months

  for (let i = 1; i <= monthsAhead; i++) {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const monthString = nextMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    results.push({
      month: monthString,
      predictedExpenses: predictedExpenses,
      predictedSavings: monthlyIncome - predictedExpenses,
      confidence
    });
  }

  return results;
}

/**
 * Generates weekly forecasts based on current month's transactions.
 */
export function generateWeeklyForecast(
  transactions: { amount: number; date: Date }[],
  daysInMonth: number
): WeeklyForecast[] {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  
  const weekCount = Math.ceil(daysInMonth / 7);
  const weeksData: { [key: number]: number } = {};
  
  for (let i = 1; i <= weekCount; i++) {
    weeksData[i] = 0;
  }
  
  for (const t of transactions) {
    const day = t.date.getDate();
    const weekNumber = Math.min(Math.ceil(day / 7), weekCount);
    weeksData[weekNumber] += t.amount;
  }
  
  const completedWeeks = Math.floor(currentDay / 7);
  let totalCompleted = 0;
  let averageCompleted = 0;
  
  if (completedWeeks > 0) {
    for (let i = 1; i <= completedWeeks; i++) {
      totalCompleted += weeksData[i];
    }
    averageCompleted = totalCompleted / completedWeeks;
  } else {
    // If no completed weeks, use actual of current partial week as forecast
    averageCompleted = weeksData[1] || 0;
  }

  const forecast: WeeklyForecast[] = [];
  for (let i = 1; i <= weekCount; i++) {
    if (i <= completedWeeks) {
      forecast.push({
        week: `Week ${i}`,
        actual: weeksData[i],
        forecast: null
      });
    } else if (i === completedWeeks + 1) {
       // current week could be partially filled
       forecast.push({
        week: `Week ${i}`,
        actual: weeksData[i],
        forecast: Math.max(averageCompleted, weeksData[i]) // assume it will reach at least average or current actual
      });
    } else {
      forecast.push({
        week: `Week ${i}`,
        actual: null,
        forecast: averageCompleted
      });
    }
  }

  return forecast;
}

/**
 * Projects when goals will be completed based on savings rate.
 */
export function projectGoalCompletion(
  goals: { name: string; targetAmount: number; savedAmount: number; emoji: string; deadline: Date }[],
  monthlySavingsRate: number
): GoalProjection[] {
  const today = new Date();
  
  return goals.map(goal => {
    let monthsRemaining = 0;
    let onTrack = false;
    let estimatedCompletionDate = 'Unknown';
    let monthlyContribution = 0;

    const remainingAmount = goal.targetAmount - goal.savedAmount;

    if (remainingAmount <= 0) {
      monthsRemaining = 0;
      onTrack = true;
      estimatedCompletionDate = today.toLocaleString('default', { month: 'short', year: 'numeric' });
    } else if (monthlySavingsRate > 0) {
      // In a real scenario we'd split monthlySavingsRate, but as requested:
      monthsRemaining = Math.ceil(remainingAmount / monthlySavingsRate);
      monthlyContribution = monthlySavingsRate; 
      
      const completionDate = new Date(today.getFullYear(), today.getMonth() + monthsRemaining, 1);
      estimatedCompletionDate = completionDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      onTrack = completionDate.getTime() <= goal.deadline.getTime();
    }

    return {
      goalName: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      monthlyContribution,
      estimatedCompletionDate,
      monthsRemaining,
      onTrack,
      emoji: goal.emoji
    };
  });
}

/**
 * Calculates cumulative savings predictions for upcoming months.
 */
export function calculateSavingsPrediction(
  monthlyIncome: number,
  monthlyExpenses: number,
  months: number = 5
): { month: string; predicted: number }[] {
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const results: { month: string; predicted: number }[] = [];
  
  const currentDate = new Date();
  let cumulativeSavings = 0;

  for (let i = 1; i <= months; i++) {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const monthString = nextMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    cumulativeSavings += monthlySavings;
    
    results.push({
      month: monthString,
      predicted: cumulativeSavings
    });
  }

  return results;
}

/**
 * Determines the spending trend based on recent monthly totals.
 */
export function getSpendingTrend(
  monthlyTotals: { month: string; total: number }[]
): 'increasing' | 'decreasing' | 'stable' {
  if (monthlyTotals.length < 2) return 'stable';
  
  const sorted = [...monthlyTotals]; // Assuming sorted oldest to newest, let's take last 3
  const recent = sorted.slice(-3);
  
  const latest = recent[recent.length - 1].total;
  const previous = recent.slice(0, -1);
  
  const avgPrevious = previous.reduce((sum, m) => sum + m.total, 0) / previous.length;
  
  if (avgPrevious === 0) {
      if (latest > 0) return 'increasing';
      return 'stable';
  }

  const ratio = latest / avgPrevious;
  
  if (ratio > 1.1) {
    return 'increasing';
  } else if (ratio < 0.9) {
    return 'decreasing';
  } else {
    return 'stable';
  }
}
