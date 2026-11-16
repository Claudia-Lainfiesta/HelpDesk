import { telegramNotifications } from '../integrations/telegram/support-default.js';
import type { SupportNotifier } from '../integrations/telegram/support-group.js';
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middlewares.js';
import { input, idSchema } from '../http/validation.js';
import {
  createTicketSchema,
  changePrioritySchema,
  createNoteSchema,
  ticketFiltersSchema,
  assignmentSchema,
  transitionSchema,
  eventFiltersSchema,
} from './validation.js';
import { createTicket, getTicket, listTickets } from './service.js';
import {
  assignableAgents,
  changeAssignment,
  transitionTicket,
  changePriority,
  addTicketNote,
  telegramContact,
} from './operations.js';
import { ticketEvents } from './activity.js';
import {
  receiveTicketImage,
  validateTicketImage,
  getTicketImage,
  imageDisposition,
} from './attachments.js';
export function ticketsRouter(support: SupportNotifier = telegramNotifications): Router {
  const router = Router();
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/', async (req, res) => {
    res.json(await listTickets(input(ticketFiltersSchema, req.query), req.auth!.user));
  });
  router.post('/', receiveTicketImage, async (req, res) => {
    const image = validateTicketImage(req.file);
    const ticket = await createTicket(
      input(createTicketSchema, req.body),
      req.auth!.user,
      req.ip,
      image,
      support,
    );
    res.location(`/api/tickets/${ticket.id}`).status(201).json(ticket);
  });
  router.get('/:id/attachment', async (req, res) => {
    const image = await getTicketImage(input(idSchema, req.params.id), req.auth!.user);
    res.set({
      'Content-Type': image.mime_type,
      'Content-Length': String(image.size_bytes),
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': imageDisposition(image.original_filename),
    });
    res.send(image.data);
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
  router.patch('/:id/priority', async (req, res) => {
    res.json(
      await changePriority(
        input(idSchema, req.params.id),
        input(changePrioritySchema, req.body).priority,
        req.auth!.user,
        req.ip,
        support,
      ),
    );
  });
  router.post('/:id/notes', async (req, res) => {
    res
      .status(201)
      .json(
        await addTicketNote(
          input(idSchema, req.params.id),
          input(createNoteSchema, req.body).body,
          req.auth!.user,
          req.ip,
        ),
      );
  });
  router.get('/:id/telegram-contact', async (req, res) => {
    res.json(await telegramContact(input(idSchema, req.params.id), req.auth!.user));
  });
  router.patch('/:id/assignment', async (req, res) => {
    res.json(
      await changeAssignment(
        input(idSchema, req.params.id),
        input(assignmentSchema, req.body).agentId,
        req.auth!.user,
        req.ip,
        support,
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
