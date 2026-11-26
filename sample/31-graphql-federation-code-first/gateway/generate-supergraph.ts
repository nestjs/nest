import {
  LocalCompose,
  RemoteGraphQLDataSource,
  SERVICE_DEFINITION_QUERY,
  type ServiceDefinition,
} from '@apollo/gateway';
import { parse } from 'graphql';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
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

const subgraphs = [
  { name: 'users', url: 'http://localhost:3002/graphql' },
  { name: 'posts', url: 'http://localhost:3003/graphql' },
];

async function fetchSubgraphSdl(url: string): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: SERVICE_DEFINITION_QUERY }),
  });
  const { data } = await response.json();
  return data._service.sdl;
}

async function generateSupergraphLocal() {
  console.log('Composing supergraph schema from the running sub-graphs...');

  const localServiceList: ServiceDefinition[] = [];
  for (const { name, url } of subgraphs) {
    try {
      const sdl = await fetchSubgraphSdl(url);
      localServiceList.push({ name, url, typeDefs: parse(sdl) });
    } catch {
      console.error(
        `Failed to fetch the "${name}" sub-graph schema from ${url}.`,
      );
      console.error(
        'Start users-application and posts-application before the gateway.',
      );
      process.exit(1);
    }
  }

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
