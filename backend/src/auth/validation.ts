import { z } from 'zod';
export const emailSchema = z.string().trim().max(254).email().toLowerCase();
