import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireRole } from '../auth/middlewares.js';
import { idSchema, input, queryBoolean } from '../http/validation.js';
import type { UserConfig } from './config.js';
import { createUserSchema, updateUserSchema, roleSchema, providerSchema } from './validation.js';
import { createUser, getUser, listUsers, updateUser, userAction } from './service.js';

const filtersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    role: roleSchema.optional(),
    active: queryBoolean.optional(),
    provider: providerSchema.optional(),
    temporary: queryBoolean.optional(),
    expired: queryBoolean.optional(),
    q: z.string().trim().max(100).optional(),
  })
  .strict();

export function usersRouter(config: UserConfig = env): Router {
  const router = Router();
  router.use(requireRole('administrador'));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/', async (req, res) => {
    res.json(await listUsers(input(filtersSchema, req.query)));
  });
  router.get('/:id', async (req, res) => {
    res.json(await getUser(input(idSchema, req.params.id)));
  });
  router.post('/', async (req, res) => {
    res
      .status(201)
      .json(
        await createUser(
          input(createUserSchema, req.body),
          { userId: req.auth!.user.id, ip: req.ip },
          config,
        ),
      );
  });
  router.patch('/:id', async (req, res) => {
    res.json(
      await updateUser(
        input(idSchema, req.params.id),
        input(updateUserSchema, req.body),
        { userId: req.auth!.user.id, ip: req.ip },
        config,
      ),
    );
  });
  for (const action of ['deactivate', 'reactivate', 'reset-password', 'unlock'] as const) {
    router.post(`/:id/${action}`, async (req, res) => {
      input(z.object({}).strict(), req.body);
      res.json(
        await userAction(input(idSchema, req.params.id), action, {
          userId: req.auth!.user.id,
          ip: req.ip,
        }),
      );
    });
  }
  return router;
}
