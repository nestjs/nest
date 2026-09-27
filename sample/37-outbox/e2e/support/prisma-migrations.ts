import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrations = fileURLToPath(
  new URL('../../prisma/migrations', import.meta.url),
);

/** Applies the Prisma migrations in order, as `prisma migrate deploy` does. */
export async function applyPrismaMigrations(
  connectionString: string,
): Promise<void> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const directories = readdirSync(migrations, { withFileTypes: true }).filter(
      entry => entry.isDirectory(),
    );
    for (const { name } of directories.sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      await client.query(
        readFileSync(`${migrations}/${name}/migration.sql`, 'utf8'),
      );
    }
  } finally {
    await client.end();
  }
}
