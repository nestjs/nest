import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` needs no database; `prisma migrate` reads DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
