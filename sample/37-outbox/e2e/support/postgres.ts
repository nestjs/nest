/**
 * The PostgreSQL server the store suites run on: the one in `SQL_TEST_PG_URL`, e.g. the
 * container of docker-compose.yml (`postgres://postgres:postgres@localhost:5432/postgres`).
 * Resolves to `null`, with the reason, without one, so a suite can skip with a clear message
 * instead of failing.
 */
import pg from 'pg';

export interface TestPostgres {
  /** Creates a database (dropping a previous one with the same name) and returns its URL. */
  createDatabase(name: string): Promise<string>;
  /** Drops the databases this process created. */
  stop(): Promise<void>;
}

export type TestPostgresResult =
  | { postgres: TestPostgres; reason?: undefined }
  | { postgres: null; reason: string };

export async function startPostgres(): Promise<TestPostgresResult> {
  const connectionString = process.env.SQL_TEST_PG_URL;
  if (!connectionString)
    return { postgres: null, reason: 'SQL_TEST_PG_URL is not set' };
  try {
    await run(connectionString, 'SELECT 1');
  } catch (error) {
    return {
      postgres: null,
      reason: `no server at SQL_TEST_PG_URL: ${(error as Error).message}`,
    };
  }

  // Several test files share the server, so every database gets a suffix of its own, and
  // nothing is dropped except the databases created here.
  const suffix = `_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const created: string[] = [];
  return {
    postgres: {
      async createDatabase(name) {
        const database = name + suffix;
        await run(
          connectionString,
          `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`,
        );
        await run(connectionString, `CREATE DATABASE "${database}"`);
        created.push(database);
        const url = new URL(connectionString);
        url.pathname = `/${database}`;
        return url.toString();
      },
      async stop() {
        for (const database of created.splice(0)) {
          await run(
            connectionString,
            `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`,
          );
        }
      },
    },
  };
}

async function run(connectionString: string, statement: string): Promise<void> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}
