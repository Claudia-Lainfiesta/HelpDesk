import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const server = app.listen(env.port, '127.0.0.1', (error?: Error) => {
  // Express 5 también invoca este callback ante un fallo al abrir el puerto.
  if (error) return;
  console.log(`HelpDesk API disponible en http://localhost:${env.port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE'
    ? `No se pudo iniciar la API: el puerto ${env.port} ya está en uso.`
    : `No se pudo iniciar la API: ${error.message}`);
  void pool.end().finally(() => process.exit(1));
});

let closing = false;
function shutdown(signal: NodeJS.Signals): void {
  if (closing) return;
  closing = true;
  console.log(`${signal}: cerrando HTTP y PostgreSQL...`);

  const timeout = setTimeout(() => {
    console.error('Se agotó el tiempo para cerrar la API.');
    server.closeAllConnections();
    process.exit(1);
  }, 10000);
  timeout.unref();

  server.close((error) => {
    void pool.end().then(() => {
      clearTimeout(timeout);
      process.exitCode = error ? 1 : 0;
    }).catch((poolError: unknown) => {
      console.error('No se pudo cerrar el pool:', poolError);
      process.exit(1);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
