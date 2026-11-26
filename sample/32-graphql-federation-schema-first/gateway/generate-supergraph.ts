import {
  LocalCompose,
  RemoteGraphQLDataSource,
  type ServiceDefinition,
} from '@apollo/gateway';
import { parse } from 'graphql';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateSupergraph() {
  try {
    try {
      await execAsync('rover --version');
    } catch {
      console.error('Rover CLI is not installed. Please install it first:');
      console.error('npm install -g @apollo/rover');
      process.exit(1);
    }

    console.log('Generating supergraph schema...');
    const { stdout, stderr } = await execAsync(
      'rover supergraph compose --config ./supergraph.yaml',
    );

    if (stderr && !stderr.includes('WARN')) {
      console.error('Error generating supergraph:', stderr);
      process.exit(1);
    }

    writeFileSync(join(__dirname, 'supergraph.graphql'), stdout);
    console.log('Supergraph schema generated successfully!');
    console.log('Output written to: supergraph.graphql');
  } catch (error) {
    console.error('Failed to generate supergraph:', error);
    process.exit(1);
  }
}

async function generateSupergraphLocal() {
  console.log('Composing supergraph schema from the sub-graph schema files...');

  const usersSchemaPath = join(
    __dirname,
    '..',
    'users-application',
    'src',
    'users',
    'users.graphql',
  );
  const postsSchemaPath = join(
    __dirname,
    '..',
    'posts-application',
    'src',
    'posts',
    'posts.graphql',
  );

  if (!existsSync(usersSchemaPath) || !existsSync(postsSchemaPath)) {
    console.error(
      'Schema files not found. Make sure both sub-graph applications have their schema files.',
    );
    process.exit(1);
  }

  const localServiceList: ServiceDefinition[] = [
    {
      name: 'users',
      url: 'http://localhost:3000/graphql',
      typeDefs: parse(readFileSync(usersSchemaPath, 'utf-8')),
    },
    {
      name: 'posts',
      url: 'http://localhost:3001/graphql',
      typeDefs: parse(readFileSync(postsSchemaPath, 'utf-8')),
    },
  ];

  const { supergraphSdl } = await new LocalCompose({
    localServiceList,
  }).initialize({
    update: () => {},
    healthCheck: async () => {},
    getDataSource: ({ url }) => new RemoteGraphQLDataSource({ url }),
  });

  writeFileSync(join(__dirname, 'supergraph.graphql'), supergraphSdl);
  console.log('Supergraph schema generated successfully!');
  console.log('Output written to: supergraph.graphql');
}

const useRover = process.argv.includes('--rover');

if (useRover) {
  await generateSupergraph();
} else {
  await generateSupergraphLocal();
}
