import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const transactionSchema = z.object({
  merchant: z.string().min(1),
  amount: z.number(),
  category: z.string().min(1),
  date: z.string().optional().default(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
  emoji: z.string().optional().default('💸'),
  type: z.enum(['income', 'expense', 'transfer']).optional().default('expense'),
  note: z.string().optional(),
  accountId: z.string().optional(),
});

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { category, search, type } = req.query;

    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.json({ success: true, transactions: [] });
    }

    const where: any = { userId: targetUserId };
    if (category) where.category = String(category);
    if (type) where.type = String(type);
    if (search) {
      where.OR = [
        { merchant: { contains: String(search) } },
        { category: { contains: String(search) } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, count: transactions.length, transactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const data = transactionSchema.parse(req.body);

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId: targetUserId,
      },
    });

    // Update category spent amount if expense
    if (data.type === 'expense') {
      const budget = await prisma.budget.findFirst({
        where: { userId: targetUserId, category: data.category },
      });
      if (budget) {
        await prisma.budget.update({
          where: { id: budget.id },
          data: { spentAmount: budget.spentAmount + data.amount },
        });
      }
    }

    return res.status(201).json({ success: true, transaction });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.transaction.delete({ where: { id } });
    return res.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const ocrScanReceipt = async (req: AuthRequest, res: Response) => {
  try {
    // Simulated smart OCR receipt analysis endpoint
    const { imageBase64 } = req.body;

    // Returns extracted receipt details
    const sampleResults = [
      { merchant: 'Starbucks Coffee', amount: 380, category: 'Food & Dining', emoji: '☕', date: 'Jul 19' },
      { merchant: 'Decathlon Sports', amount: 1499, category: 'Shopping', emoji: '⚽', date: 'Jul 19' },
      { merchant: 'Shell Fuel Station', amount: 2000, category: 'Transport', emoji: '⛽', date: 'Jul 19' },
    ];

    const extracted = sampleResults[Math.floor(Math.random() * sampleResults.length)];

    return res.json({
      success: true,
      extractedData: extracted,
      confidence: 0.96,
      rawText: `MERCHANT: ${extracted.merchant}\nTOTAL PAID: ₹${extracted.amount}\nDATE: ${extracted.date}\nTAX ID: GSTIN29AAACB1234F1Z1`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
