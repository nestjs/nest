/**
 * Interface defining possible body parser types, to be used with `NestExpressApplication.useBodyParser()`.
 */
export type NestUltimateExpressBodyParserType =
  | 'json'
  | 'urlencoded'
  | 'text'
  | 'raw';
