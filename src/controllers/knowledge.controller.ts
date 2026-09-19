import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getKnowledgeArticles = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = String(category);

    const articles = await prisma.knowledgeArticle.findMany({ where });
    return res.json({ success: true, articles });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getJuniorQuests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.json({ success: true, quests: [] });
    }

    const quests = await prisma.juniorQuest.findMany({ where: { userId: targetUserId } });
    const totalCoins = quests.filter((q) => q.completed).reduce((acc, q) => acc + q.rewardCoins, 0);

    return res.json({
      success: true,
      summary: { totalCoins, completedCount: quests.filter((q) => q.completed).length },
      quests,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const completeJuniorQuest = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const quest = await prisma.juniorQuest.update({
      where: { id },
      data: { completed: true, streakCount: { increment: 1 } },
    });

    return res.json({ success: true, quest });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
