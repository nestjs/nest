/**
 * Registers ts-node's ESM loader hooks via the modern node:module register() API.
 * Used with --import flag (e.g., node --import ./hooks/ts-node-register.mjs)
 * to replace the deprecated --loader flag.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

// Load reflect-metadata before any test files so decorators work correctly
import 'reflect-metadata';
