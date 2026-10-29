import { pool } from '../db/pool.js';
import { transaction } from '../db/transaction.js';
import { ApiError } from '../auth/errors.js';
import { recordAudit } from '../audit/audit.js';
import type { AuditActor } from '../audit/audit.js';
import { isUniqueViolation } from '../http/validation.js';

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
function view(row: Category) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
const columns = 'id::text, name, description, is_active, created_at, updated_at';
export interface CategoryInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export async function listCategories(includeInactive: boolean) {
  const result = await pool.query<Category>(
    `SELECT ${columns} FROM categories ${includeInactive ? '' : 'WHERE is_active'} ORDER BY lower(name), id`,
  );
  return { data: result.rows.map(view) };
}

export async function saveCategory(
  id: string | undefined,
  input: CategoryInput,
  actor: AuditActor,
) {
  try {
    return await transaction(async (client) => {
      if (!id) {
        const result = await client.query<Category>(
          `INSERT INTO categories (name, description, is_active)
          VALUES ($1, $2, $3) RETURNING ${columns}`,
          [input.name, input.description ?? null, input.isActive ?? true],
        );
        const category = result.rows[0]!;
        await recordAudit(client, {
          actor,
          action: 'categories.created',
          targetType: 'category',
          targetId: category.id,
          metadata: { isActive: category.is_active },
        });
        return view(category);
      }
      const result = await client.query<Category>(
        `SELECT ${columns} FROM categories WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const before = result.rows[0];
      if (!before) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'No se encontró la categoría.');
      const name = input.name ?? before.name;
      const description = input.description === undefined ? before.description : input.description;
      const active = input.isActive ?? before.is_active;
      const updated = await client.query<Category>(
        `UPDATE categories SET name = $2, description = $3, is_active = $4
        WHERE id = $1 RETURNING ${columns}`,
        [id, name, description, active],
      );
      const changedFields: ('name' | 'description')[] = [];
      if (before.name !== name) changedFields.push('name');
      if (before.description !== description) changedFields.push('description');
      if (changedFields.length)
        await recordAudit(client, {
          actor,
          action: 'categories.updated',
          targetType: 'category',
          targetId: id,
          metadata: { changedFields },
        });
      if (before.is_active !== active)
        await recordAudit(client, {
          actor,
          action: active ? 'categories.activated' : 'categories.deactivated',
          targetType: 'category',
          targetId: id,
          metadata: { isActive: active },
        });
      return view(updated.rows[0]!);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ApiError(409, 'CATEGORY_EXISTS', 'Ya existe una categoría con ese nombre.');
    throw error;
  }
}
