import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const chatWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (targetUserId) {
      await prisma.aIChatHistory.create({
        data: { role: 'user', content: message, userId: targetUserId },
      });
    }

    const lowerMessage = message.toLowerCase();
    let reply = "I'm your MoneyMate AI Financial Assistant. How can I help optimize your money today?";

    if (lowerMessage.includes('budget') || lowerMessage.includes('spend')) {
      reply = "Based on your recent transactions, your **Food & Dining** spending is at 82% of your monthly budget limit. Consider cutting back on dining out this weekend to stay on track!";
    } else if (lowerMessage.includes('invest') || lowerMessage.includes('sip') || lowerMessage.includes('stock')) {
      reply = 'Your current investment portfolio is yielding a **+23.75% return** overall. Increasing your monthly Index Fund SIP by ₹2,000 could accelerate your Emergency Fund goal by 2 months!';
    } else if (lowerMessage.includes('tax') || lowerMessage.includes('save tax')) {
      reply = 'Under the new tax regime, you get standard deductions of ₹75,000. Under the old regime, Section 80C allows tax-saving investments up to ₹1.5 Lakhs (ELSS, PPF, EPF).';
    } else if (lowerMessage.includes('bill') || lowerMessage.includes('rent') || lowerMessage.includes('due')) {
      reply = 'You have 3 upcoming bills due this week: **Internet (₹1,499)** due today, **Electricity (₹1,850)** due Jul 20, and **Rent (₹25,000)** due Jul 25.';
    }

    if (targetUserId) {
      await prisma.aIChatHistory.create({
        data: { role: 'assistant', content: reply, userId: targetUserId },
      });
    }

    return res.json({
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAIInsights = async (req: AuthRequest, res: Response) => {
  try {
    const insights = [
      {
        id: '1',
        title: 'High Food & Dining Outflow',
        type: 'warning',
        description: 'You spent 15% more on food delivery compared to last month. Cooking 2 extra meals a week can save ₹3,200/month.',
        icon: '🍕',
        actionLabel: 'View Food Budget',
      },
      {
        id: '2',
        title: 'Emergency Fund Milestones',
        type: 'success',
        description: "You've saved 48% of your Emergency Fund goal! At your current rate, you will reach your target 1 month ahead of schedule.",
        icon: '🛡️',
        actionLabel: 'Deposit to Goal',
      },
      {
        id: '3',
        title: 'Unused Subscription Alert',
        type: 'info',
        description: 'You paid ₹649 for Netflix but haven\'t logged any entertainment transactions in 12 days.',
        icon: '🎬',
        actionLabel: 'Manage Subscriptions',
      },
    ];

    return res.json({ success: true, insights });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
