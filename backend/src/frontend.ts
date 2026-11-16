import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const angularDirectory = fileURLToPath(
  new URL('../../frontend/dist/HelpDesk/browser/', import.meta.url),
);

export function serveFrontend(app: Express, directory = angularDirectory) {
  const index = resolve(directory, 'index.html');
  if (!existsSync(index))
    throw new Error(
      'No se encontró index.html de Angular. Ejecuta npm run build:production desde la raíz.',
    );
  app.use(express.static(directory, { index: false, maxAge: 0, dotfiles: 'deny' }));
  // Express 5 exige un wildcard con nombre; las llaves incluyen también la raíz.
  app.get('/{*ruta}', (req, res, next) => {
    if (extname(req.path) || !req.accepts('html')) {
      next();
      return;
    }
    res.set('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}
