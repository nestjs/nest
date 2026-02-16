import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { H3Event as H3EventType } from 'h3';

/**
 * Parameter decorator that extracts the underlying H3 event from the request.
 * The H3 event provides access to H3-specific APIs and utilities.
 *
 * @example
 * ```typescript
 * import { H3Event } from '@nestjs/platform-h3';
 *
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   findAll(@H3Event() event: H3EventType) {
 *     // Access H3-specific APIs
 *     const query = getQuery(event);
 *     const cookies = parseCookies(event);
 *     return { query, cookies };
 *   }
 * }
 * ```
 *
 * @returns The H3Event object attached to the request
 *
 * @publicApi
 */
export const H3Event = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): H3EventType | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.h3Event;
  },
);

/**
 * Parameter decorator that extracts the raw H3 request object.
 * This is the Node.js IncomingMessage with H3-specific properties attached.
 *
 * @example
 * ```typescript
 * import { H3Request } from '@nestjs/platform-h3';
 *
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   findAll(@H3Request() req: any) {
 *     // Access request with H3 properties
 *     console.log(req.query);  // Query parameters
 *     console.log(req.params); // Route parameters
 *     console.log(req.body);   // Parsed body
 *     return { url: req.url };
 *   }
 * }
 * ```
 *
 * @returns The request object with H3 properties
 *
 * @publicApi
 */
export const H3Request = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): any => {
    return ctx.switchToHttp().getRequest();
  },
);

/**
 * Parameter decorator that extracts the raw H3 response object.
 * This is the Node.js ServerResponse used by the H3 adapter.
 *
 * @example
 * ```typescript
 * import { H3Response } from '@nestjs/platform-h3';
 *
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   findAll(@H3Response() res: ServerResponse) {
 *     // Access response to set headers, status, etc.
 *     res.setHeader('X-Custom-Header', 'value');
 *     return { message: 'success' };
 *   }
 * }
 * ```
 *
 * @returns The Node.js ServerResponse object
 *
 * @publicApi
 */
export const H3Response = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): any => {
    return ctx.switchToHttp().getResponse();
  },
);

/**
 * Parameter decorator that extracts query parameters from the H3 request.
 * If a key is provided, returns the specific query parameter value.
 * If no key is provided, returns all query parameters.
 *
 * @example
 * ```typescript
 * import { H3Query } from '@nestjs/platform-h3';
 *
 * @Controller('users')
 * export class UsersController {
 *   // Get all query parameters
 *   @Get()
 *   findAll(@H3Query() query: Record<string, string>) {
 *     return { query };
 *   }
 *
 *   // Get specific query parameter
 *   @Get('search')
 *   search(@H3Query('term') searchTerm: string) {
 *     return { searchTerm };
 *   }
 * }
 * ```
 *
 * @param key - Optional key to extract a specific query parameter
 * @returns The query parameters object or a specific value
 *
 * @publicApi
 */
export const H3Query = createParamDecorator(
  (
    key: string | undefined,
    ctx: ExecutionContext,
  ): Record<string, any> | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query || {};
    return key ? query[key] : query;
  },
);

/**
 * Parameter decorator that extracts route parameters from the H3 request.
 * If a key is provided, returns the specific route parameter value.
 * If no key is provided, returns all route parameters.
 *
 * @example
 * ```typescript
 * import { H3Params } from '@nestjs/platform-h3';
 *
 * @Controller('users')
 * export class UsersController {
 *   // Get all route parameters
 *   @Get(':id/posts/:postId')
 *   getPost(@H3Params() params: { id: string; postId: string }) {
 *     return { params };
 *   }
 *
 *   // Get specific route parameter
 *   @Get(':id')
 *   findOne(@H3Params('id') id: string) {
 *     return { userId: id };
 *   }
 * }
 * ```
 *
 * @param key - Optional key to extract a specific route parameter
 * @returns The route parameters object or a specific value
 *
 * @publicApi
 */
export const H3Params = createParamDecorator(
  (
    key: string | undefined,
    ctx: ExecutionContext,
  ): Record<string, any> | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const params = request.params || {};
    return key ? params[key] : params;
  },
);

/**
 * Parameter decorator that extracts the request body from the H3 request.
 * If a key is provided, returns the specific body property value.
 * If no key is provided, returns the entire body.
 *
 * @example
 * ```typescript
 * import { H3Body } from '@nestjs/platform-h3';
 *
 * @Controller('users')
 * export class UsersController {
 *   // Get entire body
 *   @Post()
 *   create(@H3Body() body: CreateUserDto) {
 *     return { user: body };
 *   }
 *
 *   // Get specific body property
 *   @Post('register')
 *   register(@H3Body('email') email: string) {
 *     return { email };
 *   }
 * }
 * ```
 *
 * @param key - Optional key to extract a specific body property
 * @returns The body object or a specific value
 *
 * @publicApi
 */
export const H3Body = createParamDecorator(
  (key: string | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body || {};
    return key ? body[key] : body;
  },
);
