import * as path from 'path';

type ResolveFilename = (
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options?: Record<string, unknown>,
) => string;

const Module = require('module') as {
  _resolveFilename: ResolveFilename;
};

const workspaceRoot = path.join(__dirname, '..', '..');
const packageRoots = new Map<string, string>([
  ['@nestjs/common', path.join(workspaceRoot, 'packages/common')],
  ['@nestjs/core', path.join(workspaceRoot, 'packages/core')],
  ['@nestjs/microservices', path.join(workspaceRoot, 'packages/microservices')],
  [
    '@nestjs/platform-express',
    path.join(workspaceRoot, 'packages/platform-express'),
  ],
  [
    '@nestjs/platform-fastify',
    path.join(workspaceRoot, 'packages/platform-fastify'),
  ],
  [
    '@nestjs/platform-socket.io',
    path.join(workspaceRoot, 'packages/platform-socket.io'),
  ],
  ['@nestjs/platform-ws', path.join(workspaceRoot, 'packages/platform-ws')],
  ['@nestjs/testing', path.join(workspaceRoot, 'packages/testing')],
  ['@nestjs/websockets', path.join(workspaceRoot, 'packages/websockets')],
]);

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(
  request,
  parent,
  isMain,
  options,
) {
  const directMatch = packageRoots.get(request);
  if (directMatch) {
    return originalResolveFilename.call(
      this,
      directMatch,
      parent,
      isMain,
      options,
    );
  }

  for (const [packageName, packageRoot] of packageRoots) {
    if (request.startsWith(`${packageName}/`)) {
      const relativePath = request.slice(packageName.length + 1);
      return originalResolveFilename.call(
        this,
        path.join(packageRoot, relativePath),
        parent,
        isMain,
        options,
      );
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
