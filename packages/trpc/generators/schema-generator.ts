import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { ProcedureType } from '../enums';
import { serializeZodSchema } from './zod-serializer';

export interface ProcedureInfo {
  name: string;
  type: ProcedureType;
  inputSchema?: any;
  outputSchema?: any;
}

export interface RouterInfo {
  alias?: string;
  procedures: ProcedureInfo[];
}

/**
 * Generates a TypeScript file containing the typed `AppRouter`
 * for tRPC client consumption.
 *
 * The generated file is for **type inference only** — it uses placeholder
 * handlers that are never executed at runtime. This mirrors the
 * `autoSchemaFile` pattern from `@nestjs/graphql`.
 *
 * @internal
 */
export function generateSchema(routers: RouterInfo[], filePath: string): void {
  const content = generateSchemaContent(routers);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Produces the TypeScript source for the generated AppRouter file.
 * Exported separately for testing.
 *
 * @internal
 */
export function generateSchemaContent(routers: RouterInfo[]): string {
  const lines: string[] = [
    '// ------------------------------------------------------',
    '// THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)',
    '// @nestjs/trpc',
    '// ------------------------------------------------------',
    '',
    "import { initTRPC } from '@trpc/server';",
  ];

  const usesZod = routers.some(r =>
    r.procedures.some(p => p.inputSchema || p.outputSchema),
  );
  if (usesZod) {
    lines.push("import { z } from 'zod';");
  }

  lines.push('');
  lines.push('const t = initTRPC.create();');
  lines.push('');

  // Group procedures: aliased → sub-routers, un-aliased → root
  const rootProcedures: ProcedureInfo[] = [];
  const aliasedGroups = new Map<string, ProcedureInfo[]>();

  for (const router of routers) {
    if (router.alias) {
      const existing = aliasedGroups.get(router.alias) ?? [];
      existing.push(...router.procedures);
      aliasedGroups.set(router.alias, existing);
    } else {
      rootProcedures.push(...router.procedures);
    }
  }

  const routerEntries: string[] = [];

  for (const [alias, procedures] of aliasedGroups) {
    const procedureLines = procedures.map(p => `    ${formatProcedure(p)},`);
    routerEntries.push(
      `  ${alias}: t.router({\n${procedureLines.join('\n')}\n  })`,
    );
  }

  for (const proc of rootProcedures) {
    routerEntries.push(`  ${formatProcedure(proc)}`);
  }

  lines.push('const appRouter = t.router({');
  lines.push(routerEntries.join(',\n'));
  lines.push('});');
  lines.push('');
  lines.push('export type AppRouter = typeof appRouter;');
  lines.push('');

  return lines.join('\n');
}

function formatProcedure(proc: ProcedureInfo): string {
  let chain = 't.procedure';

  if (proc.inputSchema) {
    chain += `.input(${serializeZodSchema(proc.inputSchema)})`;
  }
  if (proc.outputSchema) {
    chain += `.output(${serializeZodSchema(proc.outputSchema)})`;
  }

  const placeholder = "'PLACEHOLDER_DO_NOT_REMOVE' as any";

  switch (proc.type) {
    case ProcedureType.QUERY:
      chain += `.query(() => ${placeholder})`;
      break;
    case ProcedureType.MUTATION:
      chain += `.mutation(() => ${placeholder})`;
      break;
    case ProcedureType.SUBSCRIPTION:
      chain += `.subscription(() => ${placeholder})`;
      break;
  }

  return `${proc.name}: ${chain}`;
}
