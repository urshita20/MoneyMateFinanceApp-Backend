/**
 * Spending Analyzer Module for FinSphere AI Engine
 * Provides insights based on transaction arrays.
 */
/**
 * Maps category names to emojis.
 * @param category - The category name
 * @returns The emoji string
 */
export function getCategoryEmoji(category) {
    const map = {
        'Food & Dining': '🍕',
        'Transport': '🚗',
        'Shopping': '🛒',
        'Utilities': '⚡',
        'Groceries': '🛒',
        'Health': '💊',
        'Entertainment': '🎬',
        'Education': '📚',
        'Housing': '🏠'
    };
    return map[category] || '💸';
}
/**
 * Group expenses by category, sort by amount desc, return with percentages.
 * @param transactions Array of transactions
 * @param limit Max number of categories to return (default: 5)
 */
export function getTopCategories(transactions, limit = 5) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0)
        return [];
    const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0);
    const categoryMap = new Map();
    for (const txn of expenses) {
        const existing = categoryMap.get(txn.category) || { amount: 0, count: 0, emoji: txn.emoji || getCategoryEmoji(txn.category) };
        existing.amount += txn.amount;
        existing.count += 1;
        categoryMap.set(txn.category, existing);
    }
    const result = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / totalSpend) * 100,
        emoji: data.emoji
    }));
    return result.sort((a, b) => b.amount - a.amount).slice(0, limit);
}
/**
 * Compare category spending between months, flag categories where spending increased by more than threshold%.
 * @param currentMonthTxns Array of current month's transactions
 * @param lastMonthTxns Array of last month's transactions
 * @param threshold Percentage threshold (default: 15)
 */
export function detectAnomalies(currentMonthTxns, lastMonthTxns, threshold = 15) {
    const currentExpenses = currentMonthTxns.filter(t => t.type === 'expense');
    const lastExpenses = lastMonthTxns.filter(t => t.type === 'expense');
    if (currentExpenses.length === 0)
        return [];
    const currentMap = new Map();
    const lastMap = new Map();
    currentExpenses.forEach(t => currentMap.set(t.category, (currentMap.get(t.category) || 0) + t.amount));
    lastExpenses.forEach(t => lastMap.set(t.category, (lastMap.get(t.category) || 0) + t.amount));
    const anomalies = [];
    for (const [category, currentAmount] of currentMap.entries()) {
        const previousAmount = lastMap.get(category) || 0;
        let changePercent = 0;
        if (previousAmount === 0) {
            changePercent = 100; // New category spend, treating as 100% increase to flag it
        }
        else {
            changePercent = ((currentAmount - previousAmount) / previousAmount) * 100;
        }
        if (changePercent > threshold) {
            let severity = 'low';
            if (changePercent > 30)
                severity = 'high';
            else if (changePercent > 15)
                severity = 'medium';
            else if (changePercent > 5)
                severity = 'low';
            anomalies.push({
                category,
                currentAmount,
                previousAmount,
                changePercent,
                emoji: getCategoryEmoji(category),
                severity
            });
        }
    }
    return anomalies.sort((a, b) => b.changePercent - a.changePercent);
}
/**
 * Calculate daily burn rate, project monthly total, calculate remaining budget and days of budget left.
 * @param currentMonthTxns Array of current month's transactions
 * @param monthlyBudget Total monthly budget
 * @param dayOfMonth Current day of the month
 * @param daysInMonth Total days in the month
 */
export function getSpendingVelocity(currentMonthTxns, monthlyBudget, dayOfMonth, daysInMonth) {
    const expenses = currentMonthTxns.filter(t => t.type === 'expense');
    const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
    if (dayOfMonth <= 0)
        dayOfMonth = 1;
    const dailyBurnRate = totalSpent / dayOfMonth;
    const projectedMonthlyTotal = dailyBurnRate * daysInMonth;
    const remainingBudget = monthlyBudget - totalSpent;
    let daysOfBudgetLeft = 0;
    if (dailyBurnRate > 0) {
        daysOfBudgetLeft = remainingBudget / dailyBurnRate;
    }
    else {
        daysOfBudgetLeft = daysInMonth - dayOfMonth; // no spend yet
    }
    const onTrack = projectedMonthlyTotal <= monthlyBudget;
    return {
        dailyBurnRate,
        projectedMonthlyTotal,
        remainingBudget,
        daysOfBudgetLeft,
        onTrack
    };
}
/**
 * Group by merchant, return top merchants by total spent.
 * @param transactions Array of transactions
 * @param limit Max number of merchants to return (default: 5)
 */
export function getTopMerchants(transactions, limit = 5) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0)
        return [];
    const merchantMap = new Map();
    for (const txn of expenses) {
        const existing = merchantMap.get(txn.merchant) || {
            merchant: txn.merchant,
            totalSpent: 0,
            transactionCount: 0,
            category: txn.category,
            emoji: txn.emoji || getCategoryEmoji(txn.category)
        };
        existing.totalSpent += txn.amount;
        existing.transactionCount += 1;
        merchantMap.set(txn.merchant, existing);
    }
    const result = Array.from(merchantMap.values());
    return result.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit);
}
/**
 * Group spending by day of week (Mon-Sun), return average and total per day.
 * @param transactions Array of transactions
 */
export function getWeekdayPatterns(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns = new Map();
    weekdays.forEach(day => {
        patterns.set(day, { weekday: day, averageSpend: 0, totalSpend: 0, transactionCount: 0 });
    });
    for (const txn of expenses) {
        const date = new Date(txn.date);
        const day = weekdays[date.getDay()];
        if (day) {
            const p = patterns.get(day);
            p.totalSpend += txn.amount;
            p.transactionCount += 1;
        }
    }
    return Array.from(patterns.values()).map(p => {
        if (p.transactionCount > 0) {
            p.averageSpend = p.totalSpend / p.transactionCount;
        }
        return p;
    });
}
/**
 * Find merchants appearing 2+ times with similar amounts (within 10%), flag as potential subscriptions/recurring.
 * @param transactions Array of transactions
 */
export function detectRecurringExpenses(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0)
        return [];
    const merchantTxns = new Map();
    for (const txn of expenses) {
        const amounts = merchantTxns.get(txn.merchant) || [];
        amounts.push(txn.amount);
        merchantTxns.set(txn.merchant, amounts);
    }
    const recurring = [];
    for (const [merchant, amounts] of merchantTxns.entries()) {
        if (amounts.length >= 2) {
            const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
            // Check if all amounts are within 10% of the average
            const isSimilar = amounts.every(amt => Math.abs(amt - avg) / avg <= 0.1);
            if (isSimilar) {
                recurring.push({
                    merchant,
                    amount: avg,
                    occurrences: amounts.length
                });
            }
        }
    }
    return recurring;
}
