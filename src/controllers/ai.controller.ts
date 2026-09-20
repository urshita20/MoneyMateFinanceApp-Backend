import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { processChat, getInsights, getDashboard } from '../services/ai.engine.js';

/**
 * POST /api/ai/chat
 * AI-powered financial chat assistant using real user data
 */
export const chatWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Resolve user ID (authenticated user or demo fallback)
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'No user found' });
    }

    // Save user message to chat history
    await prisma.aIChatHistory.create({
      data: { role: 'user', content: message, userId: targetUserId },
    });

    // Process through AI engine (intent classification → data analysis → response generation)
    const aiResponse = await processChat(targetUserId, message);

    // Save assistant response to chat history
    await prisma.aIChatHistory.create({
      data: { role: 'assistant', content: aiResponse.reply, userId: targetUserId },
    });

    return res.json({
      success: true,
      reply: aiResponse.reply,
      followUp: aiResponse.followUp || null,
      actionLabel: aiResponse.actionLabel || null,
      tone: aiResponse.tone,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'AI processing failed. Please try again.',
      reply: "I'm having trouble processing your request right now. Please try again in a moment! 🔄",
    });
  }
};

/**
 * GET /api/ai/insights
 * Dynamic, data-driven financial insights based on real user data
 */
export const getAIInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'No user found' });
    }

    // Generate real insights from user's financial data
    const insights = await getInsights(targetUserId);

    return res.json({ success: true, insights });
  } catch (error: any) {
    console.error('AI Insights Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/ai/dashboard
 * Full AI dashboard data: forecasts, predictions, category analysis, tips
 */
export const getAIDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'No user found' });
    }

    // Generate full dashboard data from real financial analysis
    const dashboardData = await getDashboard(targetUserId);

    return res.json({ success: true, ...dashboardData });
  } catch (error: any) {
    console.error('AI Dashboard Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
