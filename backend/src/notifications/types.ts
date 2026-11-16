export const notificationTypes = [
  'ticket_assigned',
  'ticket_reassigned',
  'ticket_started',
  'ticket_waiting',
  'ticket_resolved',
  'ticket_reopened',
  'ticket_closed',
  'priority_changed',
] as const;
export type NotificationType = (typeof notificationTypes)[number];
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  ticketId: string | null;
  ticketNumber: string | null;
  readAt: string | null;
  createdAt: string;
}
