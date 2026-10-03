// The types of the Drizzle database that DrizzleModule registers (app.module.ts).
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;
/** The `tx` that `db.transaction()` passes its callback. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
