import { defineConfig } from 'drizzle-kit';

// The order API's migrations: its own tables. The outbox's store creates its own schema.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
