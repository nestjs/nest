import { PipeTransform, Type } from '@nestjs/common';
import { WsParamtype } from '../enums/ws-paramtype.enum';
import { createPipesWsParamDecorator } from '../utils/param.utils';

/**
 * Websockets message body parameter decorator.
 *
 * @publicApi
 */
export function MessageBody(): ParameterDecorator;
/**
 * Websockets message body parameter decorator.
 *
 * Example:
 * ```typescript
 * queryDb(@MessageBody(new ValidationPipe()) dto: DTO)
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
 * Websockets message body parameter decorator. Extracts a property from the
 * message body object and populates the decorated parameter with the value of `body`.
 * May also apply pipes to the bound parameter.
 *
 * For example, extracting all params:
 * ```typescript
 * findMany(@MessageBody() ids: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```typescript
 * queryDb(@MessageBody('data') dto: { data: string })
 * ```
 *
 * For example, extracting a single param with pipe:
 * ```typescript
 * queryDb(@MessageBody('data', new ValidationPipe()) dto: { data: string })
 * ```
 * @param property name of single property to extract from the `req` object
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function MessageBody(
  property: string,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;
export function MessageBody(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createPipesWsParamDecorator(WsParamtype.PAYLOAD)(property, ...pipes);
}
