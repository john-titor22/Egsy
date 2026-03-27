import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireFarm } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireFarm);

const recordSchema = z.object({
  flockId: z.string().min(1, 'Le troupeau est requis'),
  date: z.string(),
  eggsCollected: z.number().int().min(0).default(0),
  mortalityCount: z.number().int().min(0).default(0),
  feedConsumed: z.number().min(0).default(0),
  notes: z.string().optional(),
});

// GET /api/production
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, flockId } = req.query;

    const farmFlockIds = await prisma.flock.findMany({
      where: { farmId: req.user.farmId },
      select: { id: true },
    });
    const allowedFlockIds = farmFlockIds.map(f => f.id);

    const where = {
      flockId: { in: allowedFlockIds },
    };

    if (flockId && allowedFlockIds.includes(flockId)) {
      where.flockId = flockId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const records = await prisma.productionRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        flock: { select: { id: true, name: true, breed: true } },
      },
      take: 100,
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// POST /api/production
router.post('/', async (req, res, next) => {
  try {
    const data = recordSchema.parse(req.body);

    const flock = await prisma.flock.findFirst({
      where: { id: data.flockId, farmId: req.user.farmId },
    });
    if (!flock) {
      return res.status(404).json({ error: 'Troupeau non trouvé' });
    }

    const record = await prisma.productionRecord.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
      include: {
        flock: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(record);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// GET /api/production/flock/:flockId
router.get('/flock/:flockId', async (req, res, next) => {
  try {
    const flock = await prisma.flock.findFirst({
      where: { id: req.params.flockId, farmId: req.user.farmId },
    });
    if (!flock) {
      return res.status(404).json({ error: 'Troupeau non trouvé' });
    }

    const records = await prisma.productionRecord.findMany({
      where: { flockId: req.params.flockId },
      orderBy: { date: 'desc' },
      take: 60,
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// GET /api/production/stats
router.get('/stats', async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const farmFlockIds = await prisma.flock.findMany({
      where: { farmId: req.user.farmId },
      select: { id: true, name: true, quantity: true },
    });
    const flockIds = farmFlockIds.map(f => f.id);

    const records = await prisma.productionRecord.findMany({
      where: {
        flockId: { in: flockIds },
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const totalEggs = records.reduce((sum, r) => sum + r.eggsCollected, 0);
    const totalMortality = records.reduce((sum, r) => sum + r.mortalityCount, 0);
    const totalFeed = records.reduce((sum, r) => sum + r.feedConsumed, 0);
    const totalBirds = farmFlockIds.reduce((sum, f) => sum + f.quantity, 0);
    const mortalityRate = totalBirds > 0 ? ((totalMortality / totalBirds) * 100).toFixed(2) : 0;

    // Group by day for chart
    const dailyData = {};
    records.forEach(r => {
      const day = r.date.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { date: day, eggsCollected: 0, mortalityCount: 0, feedConsumed: 0 };
      }
      dailyData[day].eggsCollected += r.eggsCollected;
      dailyData[day].mortalityCount += r.mortalityCount;
      dailyData[day].feedConsumed += r.feedConsumed;
    });

    res.json({
      totalEggs,
      totalMortality,
      totalFeed: totalFeed.toFixed(2),
      mortalityRate,
      dailyData: Object.values(dailyData),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
