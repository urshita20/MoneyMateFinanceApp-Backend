/**
 * Chat message intent classification using keyword and pattern matching.
 */

export type Intent = 
  | 'BUDGET_QUERY'
  | 'SAVINGS_QUERY' 
  | 'INVESTMENT_QUERY'
  | 'TAX_QUERY'
  | 'BILL_QUERY'
  | 'GOAL_QUERY'
  | 'SPENDING_QUERY'
  | 'AFFORD_QUERY'
  | 'CREDIT_QUERY'
  | 'LOAN_QUERY'
  | 'FORECAST_QUERY'
  | 'EDUCATION_QUERY'
  | 'GENERAL_GREETING'
  | 'GENERAL_HELP'
  | 'UNKNOWN';

export interface ClassifiedIntent {
  intent: Intent;
  confidence: number;
  entities: Record<string, string>;
  originalMessage: string;
}

const intentKeywords: Record<Intent, string[]> = {
  BUDGET_QUERY: ['budget', 'spending limit', 'over budget', 'under budget', 'how much can i spend', 'limit'],
  SAVINGS_QUERY: ['save', 'savings', 'saving rate', 'cut expenses', 'reduce spending', 'bachat'],
  INVESTMENT_QUERY: ['invest', 'sip', 'mutual fund', 'stock', 'portfolio', 'returns', 'nifty', 'sensex', 'fd', 'crypto'],
  TAX_QUERY: ['tax', '80c', '80d', 'tax regime', 'old regime', 'new regime', 'tax saving', 'deduction', 'itr'],
  BILL_QUERY: ['bill', 'due', 'rent', 'electricity', 'internet', 'payment due', 'upcoming', 'pay'],
  GOAL_QUERY: ['goal', 'emergency fund', 'target', 'vacation fund', 'dream', 'wishlist'],
  SPENDING_QUERY: ['spend', 'where', 'top expense', 'most money', 'category', 'overspend', 'kharch', 'kharcha'],
  AFFORD_QUERY: ['afford', 'can i buy', 'should i buy', 'purchase', 'vacation', 'trip', 'iphone', 'aukaat'],
  CREDIT_QUERY: ['credit score', 'cibil', 'credit card', 'improve credit'],
  LOAN_QUERY: ['loan', 'emi', 'prepay', 'home loan', 'personal loan', 'interest', 'udhaar', 'karz'],
  FORECAST_QUERY: ['predict', 'forecast', 'next month', 'projection', 'future', 'estimate'],
  EDUCATION_QUERY: ['what is', 'what are', 'how do', 'how to', 'explain', 'meaning of', 'tell me about', 'guide', 'learn about', 'are working'],
  GENERAL_GREETING: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'namaste', 'pranam', 'sup'],
  GENERAL_HELP: ['help', 'what can you do', 'features', 'how to use', 'kya kar sakte ho', 'assist'],
  UNKNOWN: []
};

export function extractAmount(message: string): number | null {
  const match = message.match(/(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d+)?)\s*(k|lakh|crore)?/i);
  if (!match) return null;
  
  let val = parseFloat(match[1].replace(/,/g, ''));
  const multiplier = match[2]?.toLowerCase();
  if (multiplier === 'k') val *= 1000;
  if (multiplier === 'lakh') val *= 100000;
  if (multiplier === 'crore') val *= 10000000;
  
  return val;
}

export function extractCategory(message: string): string | null {
  const categories = ['food', 'dining', 'shopping', 'entertainment', 'travel', 'health', 'education', 'rent', 'grocery'];
  const lowerMsg = message.toLowerCase();
  for (const cat of categories) {
    if (lowerMsg.includes(cat)) {
      return cat.charAt(0).toUpperCase() + cat.slice(1);
    }
  }
  return null;
}

export function extractTimePeriod(message: string): 'this_month' | 'last_month' | 'this_week' | 'this_year' | null {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('last month') || lowerMsg.includes('pichle mahine')) return 'last_month';
  if (lowerMsg.includes('this month') || lowerMsg.includes('is mahine')) return 'this_month';
  if (lowerMsg.includes('this week') || lowerMsg.includes('is hafte')) return 'this_week';
  if (lowerMsg.includes('this year') || lowerMsg.includes('is saal')) return 'this_year';
  return null;
}

export function classifyIntent(message: string): ClassifiedIntent {
  const lowerMsg = message.toLowerCase();
  
  // Strong override for educational questions
  if (/what (is|are)|how (do|to)|explain|meaning of|guide on|learn about/.test(lowerMsg)) {
    return {
      intent: 'EDUCATION_QUERY',
      confidence: 0.9,
      entities: { topic: lowerMsg },
      originalMessage: message
    };
  }

  let bestIntent: Intent = 'UNKNOWN';
  let maxScore = 0;
  let matches = 0;

  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    let score = 0;
    let localMatches = 0;
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) {
        score += 1;
        localMatches += 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent as Intent;
      matches = localMatches;
    }
  }

  let confidence = 0;
  if (matches === 1) confidence = 0.5;
  else if (matches === 2) confidence = 0.7;
  else if (matches >= 3) confidence = 0.9;

  const entities: Record<string, string> = {};
  
  const amount = extractAmount(message);
  if (amount !== null) entities.amount = amount.toString();
  
  const category = extractCategory(message);
  if (category) entities.category = category;
  
  const timePeriod = extractTimePeriod(message);
  if (timePeriod) entities.timePeriod = timePeriod;

  return {
    intent: bestIntent,
    confidence,
    entities,
    originalMessage: message
  };
}
