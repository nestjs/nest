import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

async function generateSupergraph() {
  try {
    // Check if Rover CLI is installed
    try {
      await execAsync('rover --version');
    } catch (error) {
      console.error('Rover CLI is not installed. Please install it first:');
      console.error('npm install -g @apollo/rover');
      process.exit(1);
    }

    // Generate supergraph schema
    console.log('Generating supergraph schema...');
    const { stdout, stderr } = await execAsync(
      'rover supergraph compose --config ./supergraph.yaml',
    );

    if (stderr && !stderr.includes('WARN')) {
      console.error('Error generating supergraph:', stderr);
      process.exit(1);
    }

    // Write the supergraph schema to a file
    writeFileSync(join(__dirname, 'supergraph.graphql'), stdout);
    console.log('Supergraph schema generated successfully!');
    console.log('Output written to: supergraph.graphql');
  } catch (error) {
    console.error('Failed to generate supergraph:', error);
    process.exit(1);
  }
}

// For local development - compose schemas from files
async function generateSupergraphLocal() {
  console.log('Generating local supergraph schema from schema files...');

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

  const usersSchema = readFileSync(usersSchemaPath, 'utf-8');
  const postsSchema = readFileSync(postsSchemaPath, 'utf-8');

  // Combine schemas for local development
  // This is a simplified approach - in production, use Rover CLI
  const supergraphSchema = `
schema
  @link(url: "https://specs.apollo.dev/federation/v2.3")
  @link(url: "https://specs.apollo.dev/link/v1.0")
{
  query: Query
}

directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

directive @key(fields: String!, resolvable: Boolean = true) on OBJECT | INTERFACE

directive @requires(fields: String!) on FIELD_DEFINITION

directive @provides(fields: String!) on FIELD_DEFINITION

directive @external on OBJECT | FIELD_DEFINITION

directive @shareable on OBJECT | FIELD_DEFINITION

directive @extends on OBJECT | INTERFACE

scalar link__Import

enum link__Purpose {
  SECURITY
  EXECUTION
}

type Query {
  _entities(representations: [_Any!]!): [_Entity]!
  _service: _Service!
  getUser(id: ID!): User
  getPosts: [Post]
  findPost(id: ID!): Post
}

union _Entity = User | Post

scalar _Any

type _Service {
  sdl: String!
}

${usersSchema.replace(/^extend type Query[\s\S]*?}$/m, '')}

${postsSchema.replace(/^extend type Query[\s\S]*?}$/m, '').replace(/^extend type User[\s\S]*?}$/m, '')}
`;

  writeFileSync(join(__dirname, 'supergraph.graphql'), supergraphSchema);
  console.log('Local supergraph schema generated successfully!');
  console.log(
    'Note: For production, use Rover CLI with actual running sub-graphs.',
  );
}

// Check command line arguments
const useRover = process.argv.includes('--rover');

if (useRover) {
  generateSupergraph();
} else {
  generateSupergraphLocal();
}
