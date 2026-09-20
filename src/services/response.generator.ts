import { prisma } from '../prisma.js';
import type { Intent } from './intent.classifier.js';

export interface AIResponse {
  reply: string;
  followUp?: string;
  actionLabel?: string;
  tone: 'warning' | 'tip' | 'positive' | 'info' | 'greeting';
}

export interface InsightItem {
  id: string;
  title: string;
  type: 'warning' | 'success' | 'info' | 'tip';
  description: string;
  icon: string;
  actionLabel: string;
  priority: number;
  category?: string;
}

export interface DashboardData {
  summary: {
    text: string;
    income: number;
    expenses: number;
    savings: number;
    healthScore: number;
  };
  spendingForecast: Array<{ week: string; actual: number | null; forecast: number | null }>;
  savingsPrediction: Array<{ month: string; predicted: number }>;
  categoryInsights: Array<{ category: string; spent: number; vsLast: number; alert: boolean; emoji: string }>;
  upcomingBills: Array<{ name: string; amount: number; due: string; urgent: boolean; emoji: string }>;
  tips: Array<{ icon: string; text: string; type: 'warning' | 'tip' | 'positive' }>;
}

const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export async function generateChatReply(intent: Intent, snapshot: any, entities: any): Promise<AIResponse> {
  const userName = snapshot?.user?.name?.split(' ')[0] || 'there';
  
  switch (intent) {
    case 'BUDGET_QUERY': {
      const budgets = snapshot?.budgets || [];
      if (budgets.length === 0) {
        return {
          reply: "You haven't set up any budgets for this month yet. Would you like to create some?",
          followUp: "I can help you create an automated budget plan based on your income.",
          tone: 'info',
          actionLabel: 'Create Budgets'
        };
      }
      
      let totalBudget = 0;
      let totalSpent = 0;
      let budgetLines = budgets.map((b: any) => {
        totalBudget += b.budgetAmount;
        totalSpent += b.spentAmount;
        const percent = Math.round((b.spentAmount / b.budgetAmount) * 100);
        let status = '— On Track';
        let emoji = b.emoji || '📊';
        if (percent > 100) status = '— 🚨 Overbudget';
        else if (percent > 80) status = '— ⚠️ Warning';
        return `${emoji} **${b.category}**: ${formatCurrency(b.spentAmount)} / ${formatCurrency(b.budgetAmount)} (${percent}%) ${status}`;
      });
      
      const remaining = totalBudget - totalSpent;
      const templates = [
        `Here's your budget status for this month:\n\n${budgetLines.join('\n')}\n\nYou have **${formatCurrency(Math.max(0, remaining))}** remaining across all budgets.`,
        `Let's look at your budgets:\n\n${budgetLines.join('\n')}\n\nOverall, you have **${formatCurrency(Math.max(0, remaining))}** left to spend.`
      ];
      
      return {
        reply: getRandom(templates),
        followUp: remaining < 0 ? "Would you like tips on reducing expenses next month?" : "Would you like me to analyze which category is draining your budget the fastest?",
        tone: remaining < 0 ? 'warning' : 'info'
      };
    }
    case 'SAVINGS_QUERY': {
      const income = snapshot?.user?.monthlyIncome || 0;
      const savings = income > 0 ? income - (snapshot?.expensesTotal || 0) : 0;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
      
      const templates = [
        `Your savings rate this month is **${savingsRate.toFixed(1)}%** (${formatCurrency(savings)} of ${formatCurrency(income)} income). ${savingsRate < 20 ? "That's below the recommended 20%." : "Great job staying above the recommended 20%!"}`,
        `You've saved **${formatCurrency(savings)}** this month, which is **${savingsRate.toFixed(1)}%** of your income.`
      ];
      
      let reply = getRandom(templates);
      
      if (savingsRate < 20) {
        reply += `\n\n💡 **Quick wins to boost savings:**\n- Reduce discretionary spending by 20% \n- Cancel unused subscriptions`;
      }
      
      return {
        reply,
        followUp: "Would you like to explore investment options for your savings?",
        tone: savingsRate < 20 ? 'tip' : 'positive'
      };
    }
    case 'SPENDING_QUERY': {
      const expenses = snapshot?.expensesTotal || 0;
      const templates = [
        `You've spent **${formatCurrency(expenses)}** so far this month.`,
        `Your total spending this month stands at **${formatCurrency(expenses)}**.`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like to see a breakdown by category?",
        tone: 'info'
      };
    }
    case 'BILL_QUERY': {
      const bills = snapshot?.bills || [];
      if (bills.length === 0) {
        return {
          reply: "You have no upcoming bills tracked at the moment.",
          tone: 'positive'
        };
      }
      const billLines = bills.map((b: any) => `${b.emoji || '🧾'} **${b.name}**: ${formatCurrency(b.amount)} due on ${new Date(b.dueDate).toLocaleDateString()}`);
      const templates = [
        `Here are your upcoming bills:\n\n${billLines.join('\n')}`,
        `Upcoming payments you should be aware of:\n\n${billLines.join('\n')}`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like me to set reminders for these?",
        tone: 'info'
      };
    }
    case 'GOAL_QUERY': {
      const goals = snapshot?.goals || [];
      if (goals.length === 0) {
        return {
          reply: "You don't have any active financial goals right now.",
          followUp: "Would you like to set up an emergency fund or a vacation goal?",
          tone: 'info'
        };
      }
      const goalLines = goals.map((g: any) => {
        const percent = Math.round((g.savedAmount / g.targetAmount) * 100);
        return `${g.emoji || '🎯'} **${g.name}**: ${formatCurrency(g.savedAmount)} / ${formatCurrency(g.targetAmount)} (${percent}%)`;
      });
      const templates = [
        `Here is your progress on your goals:\n\n${goalLines.join('\n')}`,
        `Your active financial goals:\n\n${goalLines.join('\n')}`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like to allocate more funds to any of these goals?",
        tone: 'info'
      };
    }
    case 'AFFORD_QUERY': {
      const item = entities?.item || 'that item';
      const amount = entities?.amount ? Number(entities.amount) : 0;
      const savings = (snapshot?.user?.monthlyIncome || 0) - (snapshot?.expensesTotal || 0);
      const afford = savings >= amount;
      
      const templates = [
        afford ? `Yes, you can afford **${item}** (${formatCurrency(amount)}) based on your current savings of ${formatCurrency(savings)}.` : `Based on your current savings of ${formatCurrency(savings)}, buying **${item}** for ${formatCurrency(amount)} might be tight right now.`,
        afford ? `Looks good! You have enough buffer (${formatCurrency(savings)}) to purchase **${item}**.` : `You might want to wait. Purchasing **${item}** (${formatCurrency(amount)}) exceeds your current available savings (${formatCurrency(savings)}).`
      ];
      return {
        reply: getRandom(templates),
        followUp: afford ? "Would you like me to update your budget to reflect this purchase?" : "Would you like me to help you create a savings goal for this?",
        tone: afford ? 'positive' : 'warning'
      };
    }
    case 'INVESTMENT_QUERY': {
      const investments = snapshot?.investments || [];
      if (investments.length === 0) {
        return {
          reply: "You don't have any investments tracked yet.",
          followUp: "Would you like to learn about starting a SIP (Systematic Investment Plan)?",
          tone: 'info'
        };
      }
      let totalInvested = 0;
      let totalCurrent = 0;
      investments.forEach((i: any) => {
        totalInvested += i.investedAmount;
        totalCurrent += i.currentValue;
      });
      const returns = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;
      
      const templates = [
        `Your investment portfolio is currently valued at **${formatCurrency(totalCurrent)}**, with an overall return of **${returns.toFixed(2)}%** on your invested ${formatCurrency(totalInvested)}.`,
        `You have invested **${formatCurrency(totalInvested)}** and its current value is **${formatCurrency(totalCurrent)}** (${returns > 0 ? '+' : ''}${returns.toFixed(2)}%).`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like a breakdown by asset class?",
        tone: returns >= 0 ? 'positive' : 'warning'
      };
    }
    case 'TAX_QUERY': {
      const templates = [
        `Under the **New Tax Regime**, the basic exemption limit is ₹3 lakhs, with rebate up to ₹7 lakhs of income. The **Old Regime** offers various deductions like 80C, 80D, HRA etc.`,
        `Choosing between the old and new tax regimes depends on your deductions. If your total eligible deductions exceed ₹3.75 lakhs (for income > ₹15L), the Old Regime is typically better.`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like me to estimate your taxes based on your income?",
        tone: 'info'
      };
    }
    case 'CREDIT_QUERY': {
      const templates = [
        `To improve your credit score:\n- Keep your credit utilization below 30%\n- Pay bills on time\n- Don't close old credit accounts\n- Limit hard inquiries`,
        `A good credit score is built by consistent on-time payments and low credit utilization (under 30%). Also, having a mix of credit types (secured and unsecured) helps.`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like to track your credit card payments more closely?",
        tone: 'tip'
      };
    }
    case 'LOAN_QUERY': {
      const loans = snapshot?.loans || [];
      if (loans.length === 0) {
        return {
          reply: "You don't have any active loans tracked.",
          tone: 'positive'
        };
      }
      const loanLines = loans.map((l: any) => `🏦 **${l.title}**: ${formatCurrency(l.remainingAmount)} remaining @ ${l.interestRate}% EMI: ${formatCurrency(l.emi)}`);
      const templates = [
        `Here are your active loans:\n\n${loanLines.join('\n')}`,
        `Your current loan details:\n\n${loanLines.join('\n')}`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like to see how prepayments can save you interest?",
        tone: 'info'
      };
    }
    case 'FORECAST_QUERY': {
      const templates = [
        `Based on your spending trend, you are projected to spend around **${formatCurrency(snapshot?.expensesTotal ? snapshot.expensesTotal * 1.2 : 0)}** by the end of the month.`,
        `Your spending trend indicates an end-of-month total of approximately **${formatCurrency(snapshot?.expensesTotal ? snapshot.expensesTotal * 1.2 : 0)}**.`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Would you like suggestions on how to lower this projection?",
        tone: 'info'
      };
    }
    case 'GENERAL_GREETING': {
      const templates = [
        `Hi ${userName}! 👋 I'm your MoneyMate AI. You've spent ${formatCurrency(snapshot?.expensesTotal || 0)} this month. How can I help you today?`,
        `Welcome back, ${userName}! Your finances are looking organized. What would you like to explore?`
      ];
      return {
        reply: getRandom(templates),
        followUp: "You can ask me about budgets, savings, bills, or investments.",
        tone: 'greeting'
      };
    }
    case 'EDUCATION_QUERY': {
      // 1. Fallback Hardcoded Dictionary
      const KNOWLEDGE_BASE: Record<string, string> = {
        'sip': 'SIP (Systematic Investment Plan) allows you to invest a fixed amount regularly (e.g., monthly) in a mutual fund, helping you build wealth through the power of compounding.',
        'tax': 'Income tax is a percentage of your income paid to the government. The New Tax Regime offers lower rates but removes most exemptions.',
        'emergency fund': 'An emergency fund is a stash of cash set aside specifically to cover unexpected financial surprises. A good rule of thumb is saving 3-6 months of expenses.',
        'budget': 'A budget is a plan for your money. A popular rule is the 50/30/20 rule: 50% for Needs, 30% for Wants, and 20% for Savings.',
        'best sip': 'The "best" SIP depends on your goals and risk tolerance. For beginners, Broad Market Index Funds (like a Nifty 50 Index Fund) are highly recommended because they are low cost and historically provide steady, diversified growth over the long term.',
        'best mutual fund': 'There is no single "best" mutual fund, but for beginners, Index Funds or ELSS (Equity Linked Savings Scheme for tax benefits) are great starting points.'
      };

      // 2. Clean the user's input to extract just the search topic
      const rawTopic = (entities?.topic || intentResult.originalMessage || '').toLowerCase();
      const cleanTopic = rawTopic
        .replace(/what (is|are)|what's|whats|how (do|to)|explain|meaning of|guide on|learn about|the|a|an|tell me about|best/gi, '')
        .replace(/[?!.]/g, '')
        .trim();

      let reply = '';
      let source = '';

      // 3. Try Live Web Search via Wikipedia API first
      if (cleanTopic.length > 2) {
        try {
          const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTopic)}`);
          if (wikiResponse.ok) {
            const wikiData = await wikiResponse.json();
            if (wikiData && wikiData.extract) {
              reply = wikiData.extract;
              source = ' *(Source: Live Web Search)*';
            }
          }
        } catch (error) {
          console.error("Wikipedia Web Search Failed:", error);
        }
      }

      // 4. If web search fails or finds nothing, use the fallback dictionary
      if (!reply) {
        for (const [key, definition] of Object.entries(KNOWLEDGE_BASE)) {
          if (rawTopic.includes(key) || cleanTopic.includes(key)) {
            reply = definition;
            source = ' *(Source: Internal Knowledge Base)*';
            break;
          }
        }
      }

      // 5. Ultimate fallback if neither works
      if (!reply) {
        reply = `I couldn't find a live web definition for "${cleanTopic}". However, as your personal finance copilot, I am always ready to analyze your budgets and spending!`;
      }

      return {
        reply: reply + source,
        tone: 'info',
        followUp: "Is there another financial term you'd like me to look up, or would you like to check your own budget?"
      };
    }

    case 'GENERAL_HELP': {
      const templates = [
        `I can help you with several things:\n- 📊 **Budgeting**: Track and set budget limits\n- 💰 **Savings & Goals**: Monitor your progress\n- 🧾 **Bills**: Keep track of upcoming payments\n- 📈 **Investments & Loans**: Manage your portfolio\n- 💡 **Insights**: Get personalized financial tips`,
        `Here's what I can do for you:\n- Analyze your spending and budgets\n- Track your financial goals\n- Remind you of upcoming bills\n- Provide investment summaries\n- Give personalized advice`
      ];
      return {
        reply: getRandom(templates),
        followUp: "What would you like to start with?",
        tone: 'info'
      };
    }
    case 'UNKNOWN':
    default: {
      const templates = [
        `I'm not quite sure I understand. Could you rephrase that? You can ask me about your budgets, savings, bills, or investments.`,
        `I didn't catch that. I can help with tracking expenses, managing budgets, and giving investment insights. What would you like to know?`
      ];
      return {
        reply: getRandom(templates),
        followUp: "Try asking 'What is my budget status?' or 'Show my upcoming bills'.",
        tone: 'info'
      };
    }
  }
}

export async function generateInsightItems(snapshot: any, anomalies: any[], budgetAnalysis: any, forecastTrend: any): Promise<InsightItem[]> {
  const insights: InsightItem[] = [];
  
  if (budgetAnalysis?.budgets) {
    budgetAnalysis.budgets.forEach((b: any, index: number) => {
      const percent = (b.spentAmount / b.budgetAmount) * 100;
      if (percent >= 100) {
        insights.push({
          id: `budget-over-${b.id || index}`,
          title: `${b.category} Budget Exceeded`,
          type: 'warning',
          description: `You have exceeded your ${b.category} budget by ${formatCurrency(b.spentAmount - b.budgetAmount)}.`,
          icon: '🚨',
          actionLabel: 'Adjust Budget',
          priority: 1,
          category: b.category
        });
      } else if (percent >= 80) {
        insights.push({
          id: `budget-warn-${b.id || index}`,
          title: `${b.category} Budget Warning`,
          type: 'warning',
          description: `You have used ${percent.toFixed(0)}% of your ${b.category} budget.`,
          icon: '⚠️',
          actionLabel: 'Review Spending',
          priority: 2,
          category: b.category
        });
      }
    });
  }

  if (snapshot?.bills) {
    const now = new Date();
    snapshot.bills.forEach((bill: any, index: number) => {
      const dueDate = new Date(bill.dueDate);
      const daysDiff = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
      if (daysDiff < 0 && bill.status !== 'paid') {
        insights.push({
          id: `bill-overdue-${bill.id || index}`,
          title: 'Overdue Bill',
          type: 'warning',
          description: `Your bill for ${bill.name} (${formatCurrency(bill.amount)}) is overdue!`,
          icon: '❗️',
          actionLabel: 'Pay Now',
          priority: 1
        });
      } else if (daysDiff >= 0 && daysDiff <= 3 && bill.status !== 'paid') {
        insights.push({
          id: `bill-due-${bill.id || index}`,
          title: 'Upcoming Bill',
          type: 'info',
          description: `Your bill for ${bill.name} (${formatCurrency(bill.amount)}) is due in ${Math.ceil(daysDiff)} days.`,
          icon: '📅',
          actionLabel: 'View Bill',
          priority: 3
        });
      }
    });
  }
  
  if (snapshot?.user?.monthlyIncome && snapshot?.expensesTotal) {
    const savings = snapshot.user.monthlyIncome - snapshot.expensesTotal;
    const savingsRate = (savings / snapshot.user.monthlyIncome) * 100;
    
    if (savingsRate > 25) {
      insights.push({
        id: 'savings-good',
        title: 'Great Savings Rate',
        type: 'success',
        description: `You are saving ${savingsRate.toFixed(1)}% of your income. Keep it up!`,
        icon: '🌟',
        actionLabel: 'View Investments',
        priority: 4
      });
    } else if (savingsRate < 15) {
      insights.push({
        id: 'savings-low',
        title: 'Low Savings Rate',
        type: 'tip',
        description: `Your savings rate is ${savingsRate.toFixed(1)}%. Try to aim for at least 20%.`,
        icon: '💡',
        actionLabel: 'Reduce Expenses',
        priority: 3
      });
    }
  }

  insights.sort((a, b) => a.priority - b.priority);
  return insights.slice(0, 8);
}

export async function generateDashboardPayload(
  snapshot: any,
  weeklyForecast: any,
  savingsPrediction: any,
  anomalies: any,
  budgetAnalysis: any
): Promise<DashboardData> {
  const income = snapshot?.user?.monthlyIncome || 0;
  const expenses = snapshot?.expensesTotal || 0;
  const savings = income - expenses;
  const healthScore = Math.max(0, Math.min(100, 50 + (savings / income) * 100 - (anomalies?.length || 0) * 5));
  
  const textTemplates = [
    `You're doing alright this month. You've saved ${formatCurrency(savings)} so far. Keep an eye on your budgets.`,
    `Your financial health is stable. You've spent ${formatCurrency(expenses)} and saved ${formatCurrency(savings)}.`
  ];

  return {
    summary: {
      text: getRandom(textTemplates),
      income,
      expenses,
      savings,
      healthScore: Math.round(healthScore)
    },
    spendingForecast: weeklyForecast || [],
    savingsPrediction: savingsPrediction || [],
    categoryInsights: budgetAnalysis?.categories || [],
    upcomingBills: snapshot?.bills?.filter((b: any) => new Date(b.dueDate) >= new Date()) || [],
    tips: [
      {
        icon: '💡',
        text: 'Automate your investments by setting up a SIP.',
        type: 'tip'
      }
    ]
  };
}
