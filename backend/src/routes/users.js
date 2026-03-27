import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, adminOnly);

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  farmName: z.string().min(2),
  farmLocation: z.string().min(2),
});

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      include: { farm: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      farmId: u.farmId,
      farmName: u.farm?.name,
      farmLocation: u.farm?.location,
      createdAt: u.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const farm = await prisma.farm.create({
      data: { name: data.farmName, location: data.farmLocation, ownerId: 'temp' },
    });

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'OWNER',
        farmId: farm.id,
      },
    });

    await prisma.farm.update({ where: { id: farm.id }, data: { ownerId: user.id } });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      farmId: farm.id,
      farmName: farm.name,
      farmLocation: farm.location,
      createdAt: user.createdAt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'Impossible de supprimer un administrateur' });

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    next(err);
  }
});

export default router;
