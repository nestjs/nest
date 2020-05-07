/**
 * Interface describing BodyParser options that can be set.
 *
 * @see https://github.com/expressjs/body-parser
 * @publicApi
 */
export interface BodyParserOptions {
  /**
   * Controls the maximum request body size.
   */
  limit?: number;
}
