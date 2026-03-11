import { expect } from 'chai';
import { z } from 'zod';
import { join } from 'path';
import { readFileSync, existsSync, unlinkSync, rmdirSync } from 'fs';
import { ProcedureType } from '../../enums';
import {
    generateSchemaContent,
    generateSchema,
    RouterInfo,
} from '../../generators/schema-generator';

describe('generateSchemaContent', () => {
    it('should generate a valid AppRouter with aliased sub-routers', () => {
        const routers: RouterInfo[] = [
            {
                alias: 'greeting',
                procedures: [
                    {
                        name: 'hello',
                        type: ProcedureType.QUERY,
                        inputSchema: z.object({ name: z.string() }),
                    },
                    {
                        name: 'create',
                        type: ProcedureType.MUTATION,
                        inputSchema: z.object({ name: z.string() }),
                    },
                ],
            },
        ];

        const content = generateSchemaContent(routers);

        expect(content).to.include("import { initTRPC } from '@trpc/server'");
        expect(content).to.include("import { z } from 'zod'");
        expect(content).to.include('const t = initTRPC.create()');
        expect(content).to.include('greeting: t.router({');
        expect(content).to.include(
            'hello: t.procedure.input(z.object({ name: z.string() })).query',
        );
        expect(content).to.include(
            'create: t.procedure.input(z.object({ name: z.string() })).mutation',
        );
        expect(content).to.include('export type AppRouter = typeof appRouter');
    });

    it('should generate root-level procedures without alias', () => {
        const routers: RouterInfo[] = [
            {
                procedures: [
                    { name: 'ping', type: ProcedureType.QUERY },
                ],
            },
        ];

        const content = generateSchemaContent(routers);

        expect(content).to.include("ping: t.procedure.query(() => 'PLACEHOLDER_DO_NOT_REMOVE' as any)");
        expect(content).to.not.include("import { z } from 'zod'");
    });

    it('should generate procedures with output schemas', () => {
        const routers: RouterInfo[] = [
            {
                alias: 'users',
                procedures: [
                    {
                        name: 'getById',
                        type: ProcedureType.QUERY,
                        inputSchema: z.object({ id: z.string() }),
                        outputSchema: z.object({ id: z.string(), name: z.string() }),
                    },
                ],
            },
        ];

        const content = generateSchemaContent(routers);

        expect(content).to.include(
            '.input(z.object({ id: z.string() })).output(z.object({ id: z.string(), name: z.string() })).query',
        );
    });

    it('should generate subscription procedures', () => {
        const routers: RouterInfo[] = [
            {
                procedures: [
                    { name: 'onEvent', type: ProcedureType.SUBSCRIPTION },
                ],
            },
        ];

        const content = generateSchemaContent(routers);

        expect(content).to.include(
            "onEvent: t.procedure.subscription(() => 'PLACEHOLDER_DO_NOT_REMOVE' as any)",
        );
    });

    it('should merge procedures from multiple routers with the same alias', () => {
        const routers: RouterInfo[] = [
            {
                alias: 'items',
                procedures: [
                    { name: 'list', type: ProcedureType.QUERY },
                ],
            },
            {
                alias: 'items',
                procedures: [
                    { name: 'create', type: ProcedureType.MUTATION },
                ],
            },
        ];

        const content = generateSchemaContent(routers);

        // Both procedures should be under the same "items" sub-router
        expect(content).to.include('items: t.router({');
        expect(content).to.include('list: t.procedure.query');
        expect(content).to.include('create: t.procedure.mutation');
    });

    it('should include the auto-generated header', () => {
        const content = generateSchemaContent([]);
        expect(content).to.include('THIS FILE WAS AUTOMATICALLY GENERATED');
        expect(content).to.include('@nestjs/trpc');
    });

    it('should handle empty routers array', () => {
        const content = generateSchemaContent([]);
        expect(content).to.include('const appRouter = t.router({');
        expect(content).to.include('export type AppRouter = typeof appRouter');
    });
});

describe('generateSchema (file output)', () => {
    const tmpDir = join(__dirname, '__tmp__');
    const tmpFile = join(tmpDir, 'test-generated.ts');

    afterEach(() => {
        if (existsSync(tmpFile)) {
            unlinkSync(tmpFile);
        }
        if (existsSync(tmpDir)) {
            rmdirSync(tmpDir);
        }
    });

    it('should write the generated file to disk', () => {
        const routers: RouterInfo[] = [
            {
                procedures: [
                    { name: 'health', type: ProcedureType.QUERY },
                ],
            },
        ];

        generateSchema(routers, tmpFile);

        expect(existsSync(tmpFile)).to.be.true;
        const content = readFileSync(tmpFile, 'utf-8');
        expect(content).to.include('export type AppRouter = typeof appRouter');
        expect(content).to.include('health: t.procedure.query');
    });
});
