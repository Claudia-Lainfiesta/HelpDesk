import type { PoolClient } from 'pg';
import type {
  ReportFilters,
  ReportKpis,
  StatusItem,
  PriorityItem,
  CategoryItem,
  AgentItem,
  TrendItem,
  Granularity,
  CategoryOption,
  AgentOption,
  ExportTicket,
} from './types.js';

// Hasta es inclusivo a precisión de milisegundos; el límite exclusivo incluye también
// los microsegundos de PostgreSQL que caen dentro de ese último milisegundo.
function params(f: ReportFilters) {
  return [
    f.from,
    new Date(Date.parse(f.to) + 1).toISOString(),
    f.categoryId ?? null,
    f.agentId ?? null,
  ];
}
const filtered = `SELECT t.*, s.code AS status FROM tickets t
 JOIN ticket_statuses s ON s.id=t.status_id
 WHERE ($3::bigint IS NULL OR t.category_id=$3)
 AND ($4::bigint IS NULL OR t.assigned_agent_id=$4)`;
const pending = `status NOT IN ('cerrado','cancelado')`;

export async function exportTickets(db: PoolClient, f: ReportFilters): Promise<ExportTicket[]> {
  return (
    await db.query<ExportTicket>(
      `WITH filtered AS (${filtered})
      SELECT t.reference AS number,t.subject,c.name AS category,t.status,t.priority,
        r.full_name AS requester,a.full_name AS agent,t.created_at AS "createdAt",
        t.resolved_at AS "resolvedAt",t.closed_at AS "closedAt",t.canceled_at AS "canceledAt",
        (extract(epoch FROM t.resolved_at-t.created_at)/60)::float8 AS "resolutionMinutes",
        (extract(epoch FROM t.closed_at-t.created_at)/60)::float8 AS "closeMinutes"
      FROM filtered t JOIN categories c ON c.id=t.category_id
      JOIN users r ON r.id=t.requester_id LEFT JOIN users a ON a.id=t.assigned_agent_id
      WHERE t.created_at >= $1 AND t.created_at < $2 ORDER BY t.created_at DESC,t.id DESC`,
      params(f),
    )
  ).rows;
}

export async function filterExists(db: PoolClient, f: ReportFilters): Promise<boolean> {
  const result = await db.query<{ valid: boolean }>(
    `SELECT
    ($1::bigint IS NULL OR EXISTS(SELECT 1 FROM categories WHERE id=$1)) AND
    ($2::bigint IS NULL OR EXISTS(SELECT 1 FROM users u JOIN roles r ON r.id=u.role_id
      WHERE u.id=$2 AND (r.code='agente' OR EXISTS(SELECT 1 FROM tickets WHERE assigned_agent_id=u.id)))) AS valid`,
    [f.categoryId ?? null, f.agentId ?? null],
  );
  return result.rows[0]!.valid;
}
export async function summary(db: PoolClient, f: ReportFilters): Promise<ReportKpis> {
  const result = await db.query<ReportKpis>(
    `WITH filtered AS (${filtered}) SELECT
    count(*) FILTER(WHERE created_at >= $1 AND created_at < $2)::int AS created,
    count(*) FILTER(WHERE resolved_at >= $1 AND resolved_at < $2)::int AS resolved,
    count(*) FILTER(WHERE closed_at >= $1 AND closed_at < $2)::int AS closed,
    count(*) FILTER(WHERE canceled_at >= $1 AND canceled_at < $2)::int AS canceled,
    count(*) FILTER(WHERE ${pending})::int AS "pendingNow",
    (avg(extract(epoch FROM resolved_at-created_at)/60) FILTER(WHERE resolved_at >= $1 AND resolved_at < $2))::float8 AS "averageResolutionMinutes",
    (avg(extract(epoch FROM closed_at-created_at)/60) FILTER(WHERE closed_at >= $1 AND closed_at < $2))::float8 AS "averageCloseMinutes"
    FROM filtered`,
    params(f),
  );
  return result.rows[0]!;
}
export async function byStatus(db: PoolClient, f: ReportFilters): Promise<StatusItem[]> {
  return (
    await db.query<StatusItem>(
      `WITH filtered AS (${filtered})
    SELECT s.code AS status, count(t.id)::int AS count FROM ticket_statuses s
    LEFT JOIN filtered t ON t.status_id=s.id AND t.created_at >= $1 AND t.created_at < $2
    GROUP BY s.id ORDER BY s.sort_order`,
      params(f),
    )
  ).rows;
}
export async function byPriority(db: PoolClient, f: ReportFilters): Promise<PriorityItem[]> {
  return (
    await db.query<PriorityItem>(
      `WITH filtered AS (${filtered})
    SELECT p.priority, count(t.id)::int AS count FROM
    unnest(ARRAY['baja','media','alta','urgente']) WITH ORDINALITY p(priority,position)
    LEFT JOIN filtered t ON t.priority=p.priority AND t.created_at >= $1 AND t.created_at < $2
    GROUP BY p.priority,p.position ORDER BY p.position`,
      params(f),
    )
  ).rows;
}
export async function byCategory(db: PoolClient, f: ReportFilters): Promise<CategoryItem[]> {
  return (
    await db.query<CategoryItem>(
      `WITH filtered AS (${filtered})
    SELECT json_build_object('id',c.id::text,'name',c.name,'isActive',c.is_active) AS category,
    count(*)::int AS count FROM filtered t JOIN categories c ON c.id=t.category_id
    WHERE t.created_at >= $1 AND t.created_at < $2 GROUP BY c.id
    ORDER BY count DESC,c.name ASC`,
      params(f),
    )
  ).rows;
}
export async function trend(
  db: PoolClient,
  f: ReportFilters,
  granularity: Granularity,
): Promise<TrendItem[]> {
  return (
    await db.query<TrendItem>(
      `WITH filtered AS (${filtered}), buckets AS (
    SELECT generate_series(date_trunc($6, $1::timestamptz AT TIME ZONE $5),
      date_trunc($6, ($2::timestamptz - interval '1 microsecond') AT TIME ZONE $5),
      CASE $6 WHEN 'day' THEN interval '1 day' WHEN 'week' THEN interval '1 week' ELSE interval '1 month' END) AS bucket
    ), events AS (
      SELECT date_trunc($6,e.at AT TIME ZONE $5) AS bucket,e.kind FROM filtered t
      CROSS JOIN LATERAL (VALUES ('created',created_at),('resolved',resolved_at),('closed',closed_at),('canceled',canceled_at)) e(kind,at)
      WHERE e.at >= $1 AND e.at < $2
    ) SELECT to_char(b.bucket,'YYYY-MM-DD') AS bucket,
    count(*) FILTER(WHERE e.kind='created')::int AS created,
    count(*) FILTER(WHERE e.kind='resolved')::int AS resolved,
    count(*) FILTER(WHERE e.kind='closed')::int AS closed,
    count(*) FILTER(WHERE e.kind='canceled')::int AS canceled
    FROM buckets b LEFT JOIN events e ON e.bucket=b.bucket
    GROUP BY b.bucket ORDER BY b.bucket`,
      [...params(f), f.timeZone, granularity],
    )
  ).rows;
}
export async function byAgent(db: PoolClient, f: ReportFilters): Promise<AgentItem[]> {
  return (
    await db.query<AgentItem>(
      `WITH filtered AS (${filtered})
    SELECT json_build_object('id',u.id::text,'fullName',u.full_name,'isActive',u.is_active) AS agent,
    count(*) FILTER(WHERE ${pending})::int AS "assignedNow",
    count(*) FILTER(WHERE t.resolved_at >= $1 AND t.resolved_at < $2)::int AS "resolvedInRange",
    count(*) FILTER(WHERE t.closed_at >= $1 AND t.closed_at < $2)::int AS "closedInRange",
    (avg(extract(epoch FROM t.resolved_at-t.created_at)/60) FILTER(WHERE t.resolved_at >= $1 AND t.resolved_at < $2))::float8 AS "averageResolutionMinutes"
    FROM filtered t JOIN users u ON u.id=t.assigned_agent_id GROUP BY u.id
    HAVING count(*) FILTER(WHERE ${pending} OR (t.created_at >= $1 AND t.created_at < $2)
      OR (t.resolved_at >= $1 AND t.resolved_at < $2) OR (t.closed_at >= $1 AND t.closed_at < $2)
      OR (t.canceled_at >= $1 AND t.canceled_at < $2)) > 0
    ORDER BY "resolvedInRange" DESC,"assignedNow" DESC,u.full_name,u.id`,
      params(f),
    )
  ).rows;
}
export async function options(db: PoolClient) {
  const categories = await db.query<CategoryOption>(
    'SELECT id::text,name,is_active AS "isActive" FROM categories ORDER BY name,id',
  );
  const agents =
    await db.query<AgentOption>(`SELECT u.id::text,u.full_name AS "fullName",u.is_active AS "isActive"
    FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='agente'
    OR EXISTS(SELECT 1 FROM tickets WHERE assigned_agent_id=u.id) ORDER BY u.full_name,u.id`);
  return { categories: categories.rows, agents: agents.rows };
}
