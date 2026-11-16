import { EstadoTicket } from '../../shared/ui/insignia-estado';
import { TicketPriority } from '../tickets/prioridad';
export interface ReportFilters {
  from: string;
  to: string;
  timeZone: string;
  categoryId?: string;
  agentId?: string;
}
export interface ReportSummary {
  range: { from: string; to: string; timeZone: string };
  filters: { categoryId: string | null; agentId: string | null };
  kpis: {
    created: number;
    resolved: number;
    closed: number;
    canceled: number;
    pendingNow: number;
    averageResolutionMinutes: number | null;
    averageCloseMinutes: number | null;
  };
}
export interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}
export interface AgentOption {
  id: string;
  fullName: string;
  isActive: boolean;
}
export interface ReportOptions {
  categories: CategoryOption[];
  agents: AgentOption[];
}
export interface StatusItem {
  status: EstadoTicket;
  count: number;
}
export interface PriorityItem {
  priority: TicketPriority;
  count: number;
}
export interface CategoryItem {
  category: CategoryOption;
  count: number;
}
export interface TrendItem {
  bucket: string;
  created: number;
  resolved: number;
  closed: number;
  canceled: number;
}
export interface TrendReport {
  granularity: 'day' | 'week' | 'month';
  timeZone: string;
  items: TrendItem[];
}
export interface AgentItem {
  agent: AgentOption;
  assignedNow: number;
  resolvedInRange: number;
  closedInRange: number;
  averageResolutionMinutes: number | null;
}
export interface Reports {
  summary: ReportSummary;
  statuses: { items: StatusItem[] };
  priorities: { items: PriorityItem[] };
  categories: { items: CategoryItem[] };
  trend: TrendReport;
  agents: { items: AgentItem[] };
}
