import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/farms/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const farm = await prisma.farm.findUnique({
      where: { id: req.user.farmId },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: 'Ferme non trouvée' });
    }

    res.json(farm);
  } catch (err) {
    next(err);
  }
});

// PUT /api/farms/me
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { name, location } = req.body;
    const farm = await prisma.farm.update({
      where: { id: req.user.farmId },
      data: { name, location },
    });
    res.json(farm);
  } catch (err) {
    next(err);
  }
});

export default router;
