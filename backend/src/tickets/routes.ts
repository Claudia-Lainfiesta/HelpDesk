import { Router } from 'express';
import { requireAuth } from '../auth/middlewares.js';
import { input, idSchema } from '../http/validation.js';
import { createTicketSchema, ticketFiltersSchema } from './validation.js';
import { createTicket, getTicket, listTickets } from './service.js';
export function ticketsRouter(): Router {
  const router = Router();
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/', async (req, res) => {
    res.json(await listTickets(input(ticketFiltersSchema, req.query), req.auth!.user));
  });
  router.post('/', async (req, res) => {
    const ticket = await createTicket(input(createTicketSchema, req.body), req.auth!.user, req.ip);
    res.location(`/api/tickets/${ticket.id}`).status(201).json(ticket);
  });
  router.get('/:id', async (req, res) => {
    res.json(await getTicket(input(idSchema, req.params.id), req.auth!.user));
  });
  return router;
}
