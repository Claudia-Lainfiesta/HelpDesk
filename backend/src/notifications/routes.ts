import { Router } from 'express';
import { requireAuth } from '../auth/middlewares.js';
import { idSchema, input } from '../http/validation.js';
import {
  unreadCount,
  listNotifications,
  markRead,
  markAllRead,
  filtersSchema,
  emptySchema,
} from './service.js';
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
notificationsRouter.get('/unread-count', async (req, res) => {
  input(emptySchema, req.query);
  res.json(await unreadCount(req.auth!.user.id));
});
notificationsRouter.get('/', async (req, res) =>
  res.json(await listNotifications(req.auth!.user.id, input(filtersSchema, req.query))),
);
notificationsRouter.patch('/:id/read', async (req, res) => {
  input(emptySchema, req.body ?? {});
  await markRead(req.auth!.user.id, input(idSchema, req.params.id));
  res.sendStatus(204);
});
notificationsRouter.post('/read-all', async (req, res) => {
  input(emptySchema, req.body ?? {});
  await markAllRead(req.auth!.user.id);
  res.sendStatus(204);
});
