import { defineConfig } from 'drizzle-kit';

// The analytics service's migrations, in its own database. Paths are relative to the
// directory drizzle-kit runs in, the sample's root.
export default defineConfig({
  dialect: 'postgresql',
  schema: './analytics-service/src/database/schema.ts',
  out: './analytics-service/drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
