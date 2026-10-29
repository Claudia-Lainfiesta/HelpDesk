import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/middlewares.js';
import { ApiError } from '../auth/errors.js';
import { idSchema, input, queryBoolean } from '../http/validation.js';
import { listCategories, saveCategory } from './service.js';

const categorySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
const updateSchema = categorySchema.partial().refine((value) => Object.keys(value).length > 0);
export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);
categoriesRouter.get('/', async (req, res) => {
  const query = input(z.object({ includeInactive: queryBoolean.optional() }).strict(), req.query);
  if (query.includeInactive && req.auth!.user.role !== 'administrador')
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Solo el administrador puede consultar categorías inactivas.',
    );
  res.json(await listCategories(query.includeInactive ?? false));
});
categoriesRouter.post('/', requireRole('administrador'), async (req, res) => {
  res.status(201).json(
    await saveCategory(undefined, input(categorySchema, req.body), {
      userId: req.auth!.user.id,
      ip: req.ip,
    }),
  );
});
categoriesRouter.patch('/:id', requireRole('administrador'), async (req, res) => {
  res.json(
    await saveCategory(input(idSchema, req.params.id), input(updateSchema, req.body), {
      userId: req.auth!.user.id,
      ip: req.ip,
    }),
  );
});
