import {
  ModuleKind,
  ModuleResolutionKind,
  Project,
  SyntaxKind,
} from 'ts-morph';

function getHttpTypes(registration: string) {
  const project = new Project({
    tsConfigFilePath: 'tsconfig.spec.json',
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.Bundler,
      noEmit: true,
      skipLibCheck: true,
      types: ['node'],
    },
  });
  const source = project.createSourceFile(
    'packages/common/test/interfaces/http-adapter-types.fixture.ts',
    `
      import type { CanActivate, ExceptionFilter, NestInterceptor } from '@nestjs/common';
      import type { FastifyAdapter } from '@nestjs/platform-fastify';
      import type { NodeAdapter, NodeRequest, NodeResponse } from '@nestjs/platform-node';
      import type { IncomingMessage, ServerResponse } from 'node:http';

      export type Adapters = NodeAdapter | FastifyAdapter;
      ${registration}

      const canActivate: CanActivate['canActivate'] = context => {
        const http = context.switchToHttp();
        const guardRequest = http.getRequest();
        const guardResponse = http.getResponse();
        const next = http.getNext();
        return true;
      };
      const intercept: NestInterceptor['intercept'] = (context, next) => {
        const http = context.switchToHttp();
        const interceptorRequest = http.getRequest();
        const interceptorResponse = http.getResponse();
        return next.handle();
      };
      const catchException: ExceptionFilter['catch'] = (_, host) => {
        const http = host.switchToHttp();
        const filterRequest = http.getRequest();
        const filterResponse = http.getResponse();
        const explicitRequest = http.getRequest<IncomingMessage>();
        const explicitResponse = http.getResponse<ServerResponse>();
      };
    `,
  );

  const diagnostics = source.getPreEmitDiagnostics();
  expect(
    diagnostics,
    project.formatDiagnosticsWithColorAndContext(diagnostics),
  ).toHaveLength(0);

  return Object.fromEntries(
    source
      .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
      .map(declaration => [
        declaration.getName(),
        declaration.getType().getSymbol()?.getName() ??
          declaration.getType().getText(),
      ]),
  );
}

describe('HttpArgumentsHost types', () => {
  it('should infer registered request and response types in guards, interceptors and filters', () => {
    expect(
      getHttpTypes(`
      declare module '@nestjs/common' {
        interface HttpAdapterTypes {
          request: NodeRequest;
          response: NodeResponse;
        }
      }
    `),
    ).toMatchObject({
      guardRequest: 'NodeRequest',
      guardResponse: 'NodeResponse',
      interceptorRequest: 'NodeRequest',
      interceptorResponse: 'NodeResponse',
      filterRequest: 'NodeRequest',
      filterResponse: 'NodeResponse',
      explicitRequest: 'IncomingMessage',
      explicitResponse: 'ServerResponse',
      next: 'any',
    });
  });

  it('should preserve any defaults and explicit generics without registration', () => {
    expect(getHttpTypes('')).toMatchObject({
      guardRequest: 'any',
      guardResponse: 'any',
      interceptorRequest: 'any',
      interceptorResponse: 'any',
      filterRequest: 'any',
      filterResponse: 'any',
      explicitRequest: 'IncomingMessage',
      explicitResponse: 'ServerResponse',
      next: 'any',
    });
  });
});
