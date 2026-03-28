import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireFarm, requireRole } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes: authenticated, within a farm, OWNER only
router.use(authenticate, requireFarm, requireRole('OWNER'));

const inviteSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
});

// GET /api/farm-users — list all users in the OWNER's farm
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        farmId: req.user.farmId,
        role: { not: 'ADMIN' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/farm-users/invite — invite a WORKER to the OWNER's farm
router.post('/invite', async (req, res, next) => {
  try {
    const data = inviteSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex'); // 12-char hex
    const hashed = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        role: 'WORKER',
        farmId: req.user.farmId,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    // Return tempPassword once — OWNER must share it with the WORKER
    res.status(201).json({ user, tempPassword });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /api/farm-users/:id — remove a WORKER from the farm
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous supprimer vous-même' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!target) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    if (target.farmId !== req.user.farmId) {
      return res.status(403).json({ error: 'Cet utilisateur n\'appartient pas à votre ferme' });
    }
    if (target.role === 'OWNER') {
      return res.status(403).json({ error: 'Impossible de supprimer un propriétaire' });
    }
    if (target.role === 'ADMIN') {
      return res.status(403).json({ error: 'Impossible de supprimer un administrateur' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Employé supprimé avec succès' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/farm-users/:id/role — change a WORKER's role (WORKER only, cannot promote to OWNER/ADMIN)
router.patch('/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['WORKER'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide. Seul WORKER est autorisé' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!target) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    if (target.farmId !== req.user.farmId) {
      return res.status(403).json({ error: 'Cet utilisateur n\'appartient pas à votre ferme' });
    }
    if (target.role === 'OWNER' || target.role === 'ADMIN') {
      return res.status(403).json({ error: 'Impossible de modifier le rôle de ce compte' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
