import { createMigration } from './migrations.js';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'new') {
    console.log(`Creada: db/migrations/${await createMigration(args.join('_'))}`);
    return;
  }
  // Crear una migración no requiere PostgreSQL ni un archivo .env.
  const { runDatabaseCommand } = await import('./commands.js');
  await runDatabaseCommand(command ?? '');
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'No se pudo completar el comando de base de datos.',
  );
  process.exitCode = 1;
});
