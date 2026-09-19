import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getInvestments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.json({ success: true, investments: [] });
    }

    const investments = await prisma.investment.findMany({ where: { userId: targetUserId } });

    const totalInvested = investments.reduce((acc, i) => acc + i.investedAmount, 0);
    const totalCurrentValue = investments.reduce((acc, i) => acc + i.currentValue, 0);
    const overallReturns = totalCurrentValue - totalInvested;
    const overallReturnPercent = totalInvested > 0 ? ((overallReturns / totalInvested) * 100).toFixed(2) : 0;

    return res.json({
      success: true,
      portfolioSummary: {
        totalInvested,
        totalCurrentValue,
        overallReturns,
        overallReturnPercent: Number(overallReturnPercent),
      },
      investments,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getLoans = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.json({ success: true, loans: [] });
    }

    const loans = await prisma.loan.findMany({ where: { userId: targetUserId } });
    const totalOutstanding = loans.reduce((acc, l) => acc + l.remainingAmount, 0);
    const totalMonthlyEMI = loans.reduce((acc, l) => acc + l.emi, 0);

    return res.json({
      success: true,
      summary: { totalOutstanding, totalMonthlyEMI, activeLoansCount: loans.length },
      loans,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
