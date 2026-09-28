import { defineConfig } from 'drizzle-kit';

// The order API's migrations: its own tables and the outbox's.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
