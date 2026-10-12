/**
 * A template engine usable with `app.setViewEngine()`.
 *
 * @publicApi
 */
export interface NestBunViewEngine {
  /** Renders the template file at `file` with `data` to an HTML string. */
  render(file: string, data: object): string | Promise<string>;
  /** File extension appended when the view name has none, e.g. `ejs`. */
  extension?: string;
}

/**
 * A built-in engine name (loaded lazily) or a custom engine.
 *
 * @publicApi
 */
export type NestBunViewEngineOption =
  'ejs' | 'hbs' | 'handlebars' | 'pug' | NestBunViewEngine;
