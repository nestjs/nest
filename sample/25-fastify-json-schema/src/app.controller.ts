import { Controller, Schema, Post, UseFilters } from '@nestjs/common';
import { HttpErrorFilter } from './common/filters/http-exception.filter';

const bodyJsonSchema = {
  type: 'object',
  required: ['requiredKey'],
  properties: {
    someKey: { type: 'string' },
    someOtherKey: { type: 'number' },
    requiredKey: {
      type: 'array',
      maxItems: 3,
      items: { type: 'integer' },
    },
    nullableKey: { type: ['number', 'null'] }, // or { type: 'number', nullable: true }
    multipleTypesKey: { type: ['boolean', 'number'] },
    multipleRestrictedTypesKey: {
      oneOf: [
        { type: 'string', maxLength: 5 },
        { type: 'number', minimum: 10 },
      ],
    },
    enumKey: {
      type: 'string',
      enum: ['John', 'Foo'],
    },
    notTypeKey: {
      not: { type: 'array' },
    },
  },
};

const queryStringJsonSchema = {
  name: { type: 'string' },
  excitement: { type: 'integer' },
};

const paramsJsonSchema = {
  type: 'object',
  properties: {
    par1: { type: 'string' },
    par2: { type: 'number' },
  },
};

const headersJsonSchema = {
  type: 'object',
  properties: {
    'x-foo': { type: 'string' },
  },
  required: ['x-foo'],
};

const schema = {
  body: bodyJsonSchema,

  querystring: queryStringJsonSchema,

  params: paramsJsonSchema,

  headers: headersJsonSchema,
};

@Controller()
export class AppController {
  @Post()
  @Schema(schema)
  root() {
    return { message: 'Hello world!' };
  }
}
