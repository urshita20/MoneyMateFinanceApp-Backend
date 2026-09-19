import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const billSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().min(1),
  status: z.enum(['upcoming', 'due-soon', 'due-today', 'paid']).optional().default('upcoming'),
  emoji: z.string().optional().default('📄'),
  recurring: z.boolean().optional().default(true),
});

export const getBills = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.json({ success: true, bills: [] });
    }

    const bills = await prisma.bill.findMany({
      where: { userId: targetUserId },
      orderBy: { dueDate: 'asc' },
    });

    const totalUpcomingAmount = bills
      .filter((b) => b.status !== 'paid')
      .reduce((acc, b) => acc + b.amount, 0);

    return res.json({
      success: true,
      summary: { totalUpcomingAmount, upcomingCount: bills.filter((b) => b.status !== 'paid').length },
      bills,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createBill = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const data = billSchema.parse(req.body);

    const bill = await prisma.bill.create({
      data: {
        ...data,
        userId: targetUserId,
      },
    });

    return res.status(201).json({ success: true, bill });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const markBillPaid = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const bill = await prisma.bill.update({
      where: { id },
      data: { status: 'paid' },
    });

    return res.json({ success: true, bill });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBill = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.bill.delete({ where: { id } });
    return res.json({ success: true, message: 'Bill deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
