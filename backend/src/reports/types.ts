import type { TicketPriority, TicketStatus } from '../tickets/validation.js';

export interface ReportFilters {
  from: string;
  to: string;
  timeZone: string;
  days: number;
  categoryId?: string;
  agentId?: string;
}
export interface ExportTicket {
  number: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: string;
  agent: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  canceledAt: Date | null;
  resolutionMinutes: number | null;
  closeMinutes: number | null;
}
export interface ReportKpis {
  created: number;
  resolved: number;
  closed: number;
  canceled: number;
  pendingNow: number;
  averageResolutionMinutes: number | null;
  averageCloseMinutes: number | null;
}
export interface StatusItem {
  status: TicketStatus;
  count: number;
}
export interface PriorityItem {
  priority: TicketPriority;
  count: number;
}
export interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}
export interface CategoryItem {
  category: CategoryOption;
  count: number;
}
export interface AgentOption {
  id: string;
  fullName: string;
  isActive: boolean;
}
export interface AgentItem {
  agent: AgentOption;
  assignedNow: number;
  resolvedInRange: number;
  closedInRange: number;
  averageResolutionMinutes: number | null;
}
export type Granularity = 'day' | 'week' | 'month';
export interface TrendItem {
  bucket: string;
  created: number;
  resolved: number;
  closed: number;
  canceled: number;
}
