import { env } from '../../config/env.js';
import { TelegramNotificationsService } from './support-group.js';
export const telegramNotifications = new TelegramNotificationsService(env.telegram);
