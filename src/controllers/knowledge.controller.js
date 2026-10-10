import { prisma } from '../prisma.js';
export const getKnowledgeArticles = async (req, res) => {
    try {
        const { category } = req.query;
        const where = {};
        if (category)
            where.category = String(category);
        const articles = await prisma.knowledgeArticle.findMany({ where });
        return res.json({ success: true, articles });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const getJuniorQuests = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const completeJuniorQuest = async (req, res) => {
    try {
        const id = String(req.params.id);
        const quest = await prisma.juniorQuest.update({
            where: { id },
            data: { completed: true, streakCount: { increment: 1 } },
        });
        return res.json({ success: true, quest });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
