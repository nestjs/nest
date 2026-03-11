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

interface RenderableProcedure extends ProcedureInfo {
  inputSchemaVarName?: string;
  outputSchemaVarName?: string;
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
  const schemaDeclarations: string[] = [];
  const rootProcedures: RenderableProcedure[] = [];
  const aliasedGroups = new Map<string, RenderableProcedure[]>();
  let schemaDeclarationIndex = 0;

  for (const router of routers) {
    const scope = router.alias ?? 'root';
    const mapProcedure = (procedure: ProcedureInfo): RenderableProcedure => {
      const renderable: RenderableProcedure = { ...procedure };

      if (procedure.inputSchema) {
        renderable.inputSchemaVarName = createSchemaVariableName(
          scope,
          procedure.name,
          'input',
          schemaDeclarationIndex++,
        );
        schemaDeclarations.push(
          `const ${renderable.inputSchemaVarName} = ${serializeZodSchema(procedure.inputSchema)};`,
        );
      }
      if (procedure.outputSchema) {
        renderable.outputSchemaVarName = createSchemaVariableName(
          scope,
          procedure.name,
          'output',
          schemaDeclarationIndex++,
        );
        schemaDeclarations.push(
          `const ${renderable.outputSchemaVarName} = ${serializeZodSchema(procedure.outputSchema)};`,
        );
      }
      return renderable;
    };

    if (router.alias) {
      const existing = aliasedGroups.get(router.alias) ?? [];
      existing.push(...router.procedures.map(mapProcedure));
      aliasedGroups.set(router.alias, existing);
    } else {
      rootProcedures.push(...router.procedures.map(mapProcedure));
    }
  }

  if (schemaDeclarations.length > 0) {
    lines.push(...schemaDeclarations);
    lines.push('');
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

function formatProcedure(proc: RenderableProcedure): string {
  let chain = 't.procedure';

  if (proc.inputSchemaVarName) {
    chain += `.input(${proc.inputSchemaVarName})`;
  }
  if (proc.outputSchemaVarName && proc.type !== ProcedureType.SUBSCRIPTION) {
    chain += `.output(${proc.outputSchemaVarName})`;
  }

  const placeholder = getTypedPlaceholder(proc.outputSchemaVarName);

  switch (proc.type) {
    case ProcedureType.QUERY:
      chain += `.query(() => ${placeholder})`;
      break;
    case ProcedureType.MUTATION:
      chain += `.mutation(() => ${placeholder})`;
      break;
    case ProcedureType.SUBSCRIPTION:
      chain += `.subscription(async function* () { yield ${placeholder}; })`;
      break;
  }

  return `${proc.name}: ${chain}`;
}

function getTypedPlaceholder(outputSchemaVarName?: string): string {
  if (!outputSchemaVarName) {
    return 'undefined as unknown';
  }
  return `null as unknown as z.infer<typeof ${outputSchemaVarName}>`;
}

function createSchemaVariableName(
  scope: string,
  procedureName: string,
  kind: 'input' | 'output',
  index: number,
): string {
  const safeScope = sanitizeIdentifier(scope);
  const safeProcedureName = sanitizeIdentifier(procedureName);
  return `schema_${safeScope}_${safeProcedureName}_${kind}_${index}`;
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '_');
  if (!sanitized) {
    return 'unknown';
  }
  if (/^[0-9]/.test(sanitized)) {
    return `_${sanitized}`;
  }
  return sanitized;
}
