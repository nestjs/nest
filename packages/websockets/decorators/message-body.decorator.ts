import { PipeTransform, Type } from '@nestjs/common';
import type { ParameterDecoratorOptions } from '@nestjs/common';
import { WsParamtype } from '../enums/ws-paramtype.enum.js';
import { createPipesWsParamDecorator } from '../utils/param.utils.js';

/**
 * WebSockets message body parameter decorator.
 *
 * @publicApi
 */
export function MessageBody(): ParameterDecorator;
/**
 * WebSockets message body parameter decorator.
 *
 * Example:
 * ```typescript
 * create(@MessageBody(new ValidationPipe()) createDto: CreateCatDto)
 * ```
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function MessageBody(
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;
/**
 * WebSockets message body parameter decorator. Extracts a property from the
 * message payload object. May also apply pipes to the bound parameter.
 *
 * For example, extracting all params:
 * ```typescript
 * findMany(@MessageBody() ids: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```typescript
 * create(@MessageBody('data') createDto: { data: string })
 * ```
 *
 * For example, extracting a single param with pipe:
 * ```typescript
 * create(@MessageBody('data', new ValidationPipe()) createDto: { data: string })
 * ```
 * @param propertyKey name of single property to extract from the message payload
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function MessageBody(
  propertyKey: string,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;
/**
 * WebSockets message body parameter decorator. Extracts a property from the
 * message payload object with additional options.
 *
 * For example, extracting a single param with schema:
 * ```typescript
 * create(@MessageBody('data', { schema: z.string() }) data: string)
 * ```
 * @param propertyKey name of single property to extract from the message payload
 * @param options options object containing additional configuration for the decorator, such as pipes and schema
 *
 * @publicApi
 */
export function MessageBody(
  propertyKey: string,
  options: ParameterDecoratorOptions,
): ParameterDecorator;
export function MessageBody(
  propertyOrPipe?: string | (Type<PipeTransform> | PipeTransform),
  optionsOrPipe?:
    | ParameterDecoratorOptions
    | Type<PipeTransform>
    | PipeTransform,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createPipesWsParamDecorator(WsParamtype.PAYLOAD)(
    propertyOrPipe,
    optionsOrPipe,
    ...pipes,
  );
}
