import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middlewares.js';
import { input, idSchema } from '../http/validation.js';
import {
  createTicketSchema,
  ticketFiltersSchema,
  assignmentSchema,
  transitionSchema,
  eventFiltersSchema,
} from './validation.js';
import { createTicket, getTicket, listTickets } from './service.js';
import { assignableAgents, changeAssignment, transitionTicket } from './operations.js';
import { ticketEvents } from './activity.js';
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
  router.get(
    '/assignable-agents',
    requireRole('supervisor', 'administrador'),
    async (_req, res) => {
      res.json(await assignableAgents());
    },
  );
  router.get('/:id/events', async (req, res) => {
    const filters = input(eventFiltersSchema, req.query);
    res.json(
      await ticketEvents(
        input(idSchema, req.params.id),
        req.auth!.user,
        filters.page,
        filters.pageSize,
      ),
    );
  });
  router.patch('/:id/assignment', async (req, res) => {
    res.json(
      await changeAssignment(
        input(idSchema, req.params.id),
        input(assignmentSchema, req.body).agentId,
        req.auth!.user,
        req.ip,
      ),
    );
  });
  router.post('/:id/transitions', async (req, res) => {
    res.json(
      await transitionTicket(
        input(idSchema, req.params.id),
        input(transitionSchema, req.body).action,
        req.auth!.user,
        req.ip,
      ),
    );
  });
  router.get('/:id', async (req, res) => {
    res.json(await getTicket(input(idSchema, req.params.id), req.auth!.user));
  });
  return router;
}
