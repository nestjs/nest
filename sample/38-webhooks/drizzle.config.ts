import { defineConfig } from 'drizzle-kit';

// The order API's migrations: its own tables. The webhooks' and the outbox's stores create their own schemas.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
