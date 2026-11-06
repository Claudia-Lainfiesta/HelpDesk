import { env } from '../config/env.js';
import { createMailer } from './mailer.js';

// Crear el transporter no abre una conexión. Se comparte en toda la API.
export const mailer = createMailer(env.mail);
