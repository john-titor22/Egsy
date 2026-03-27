import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireFarm } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireFarm);

// GET /api/dashboard
router.get('/', async (req, res, next) => {
  try {
    const farmId = req.user.farmId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Last 7 days for production trend
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);
    last7Days.setHours(0, 0, 0, 0);

    // Active flocks count
    const activeFlocks = await prisma.flock.count({
      where: { farmId, status: 'ACTIF' },
    });

    // Total birds
    const flockAgg = await prisma.flock.aggregate({
      where: { farmId, status: 'ACTIF' },
      _sum: { quantity: true },
    });
    const totalBirds = flockAgg._sum.quantity || 0;

    // Get all flock ids for this farm
    const farmFlocks = await prisma.flock.findMany({
      where: { farmId },
      select: { id: true },
    });
    const flockIds = farmFlocks.map(f => f.id);

    // Total eggs this month
    const eggsAgg = await prisma.productionRecord.aggregate({
      where: {
        flockId: { in: flockIds },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { eggsCollected: true },
    });
    const totalEggsThisMonth = eggsAgg._sum.eggsCollected || 0;

    // Total sales this month
    const salesAgg = await prisma.sale.aggregate({
      where: {
        farmId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { totalAmount: true },
    });
    const totalSalesThisMonth = salesAgg._sum.totalAmount || 0;

    // Total expenses this month
    const expensesAgg = await prisma.expense.aggregate({
      where: {
        farmId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });
    const totalExpensesThisMonth = expensesAgg._sum.amount || 0;

    // Low stock alerts
    const allStockItems = await prisma.stockItem.findMany({
      where: { farmId },
    });
    const lowStockAlerts = allStockItems.filter(
      item => item.alertThreshold > 0 && item.quantity <= item.alertThreshold
    );

    // Recent sales (last 5)
    const recentSales = await prisma.sale.findMany({
      where: { farmId },
      orderBy: { date: 'desc' },
      take: 5,
      include: { items: true },
    });

    // Production trend (last 7 days)
    const productionRecords = await prisma.productionRecord.findMany({
      where: {
        flockId: { in: flockIds },
        date: { gte: last7Days },
      },
      orderBy: { date: 'asc' },
    });

    const trendMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(last7Days);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      trendMap[key] = { date: key, eggsCollected: 0, mortalityCount: 0 };
    }
    productionRecords.forEach(r => {
      const key = r.date.toISOString().split('T')[0];
      if (trendMap[key]) {
        trendMap[key].eggsCollected += r.eggsCollected;
        trendMap[key].mortalityCount += r.mortalityCount;
      }
    });

    res.json({
      activeFlocks,
      totalBirds,
      totalEggsThisMonth,
      totalSalesThisMonth,
      totalExpensesThisMonth,
      netProfit: totalSalesThisMonth - totalExpensesThisMonth,
      lowStockAlerts,
      recentSales,
      productionTrend: Object.values(trendMap),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
