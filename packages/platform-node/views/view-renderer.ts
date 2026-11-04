import { readFile, stat } from 'fs/promises';
import { extname, isAbsolute, join, parse, relative, resolve, sep } from 'path';

/**
 * Template engine configuration for `app.setViewEngine()`, shaped like the
 * options of `@fastify/view`:
 *
 * ```ts
 * app.setViewEngine({
 *   engine: { handlebars: require('handlebars') },
 *   templates: join(__dirname, '..', 'views'),
 * });
 * ```
 *
 * Any engine exposing Express' `__express(path, data, callback)`, a
 * `renderFile()` or a `compile()` function works (ejs, pug, handlebars, eta,
 * ...). An Express-style engine name works too: `app.setViewEngine('ejs')`,
 * with the directory set through `app.setBaseViewsDir()`.
 *
 * @publicApi
 */
export interface NodeViewOptions {
  /**
   * The engine, keyed by its name, e.g. `{ ejs: require('ejs') }`. The name
   * also determines the default file extension. A function is used as an
   * Express-style `(path, data, callback)` engine.
   */
  engine: Record<string, any>;
  /**
   * Directory (or directories, searched in order) that view names are
   * resolved against. Defaults to `<cwd>/views`.
   */
  root?: string | string[];
  /**
   * Alias of `root`, as with older `@fastify/view` versions.
   */
  templates?: string | string[];
  /**
   * Extension appended to view names that have none. Defaults to the usual
   * extension of the engine (`hbs` for handlebars, `ejs`, `pug`, ...).
   */
  viewExt?: string;
  /**
   * Data available to every template, like Express' `app.locals`.
   */
  defaultContext?: Record<string, any>;
  /**
   * Options passed to the engine when compiling or rendering.
   */
  options?: Record<string, any>;
  /**
   * Cache resolved and compiled templates. Defaults to
   * `process.env.NODE_ENV === 'production'`.
   */
  production?: boolean;
}

const DEFAULT_EXTENSIONS: Record<string, string> = {
  handlebars: 'hbs',
  nunjucks: 'njk',
  'art-template': 'art',
};

type Engine = { name: string; module: any };
type RenderFn = (data: Record<string, any>) => string | Promise<string>;

function promisify(
  fn: (callback: (err: unknown, html?: string) => void) => unknown,
): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const result = fn((err, html) =>
      err ? reject(err) : resolvePromise(html ?? ''),
    );
    // An engine may ignore the callback and return the html (art-template) or
    // a promise of it (liquidjs). Anything else leaves it to the callback
    Promise.resolve(result).then(
      html => typeof html === 'string' && resolvePromise(html),
      reject,
    );
  });
}

/**
 * Resolves view names to files and renders them with the configured engine.
 */
export class ViewRenderer {
  private engine?: Engine | Promise<Engine>;
  private engineName?: string;
  private roots: string[] = [resolve('views')];
  private viewExt?: string;
  private defaultContext: Record<string, any> = {};
  private engineOptions: Record<string, any> = {};
  private production = process.env.NODE_ENV === 'production';
  private readonly cache = new Map<string, RenderFn>();

  public setEngine(options: NodeViewOptions | string) {
    this.cache.clear();
    if (typeof options === 'string') {
      // Express style: the engine module is loaded on first render
      this.engineName = options;
      this.engine = undefined;
      return;
    }
    const [name, module] = Object.entries(options.engine ?? {})[0] ?? [];
    if (!name) {
      throw new TypeError(
        'setViewEngine() requires an engine, e.g. { engine: { ejs: require("ejs") } }',
      );
    }
    this.engineName = name;
    this.engine = { name, module };
    const root = options.root ?? options.templates;
    if (root) {
      this.setBaseViewsDir(root);
    }
    this.viewExt = options.viewExt;
    this.defaultContext = options.defaultContext ?? {};
    this.engineOptions = options.options ?? {};
    this.production = options.production ?? this.production;
  }

  public setBaseViewsDir(path: string | string[]) {
    this.cache.clear();
    this.roots = ([] as string[]).concat(path).map(dir => resolve(dir));
  }

  public isConfigured() {
    return this.engineName !== undefined;
  }

  public async render(view: string, data: object = {}): Promise<string> {
    const key = view;
    let renderFn = this.cache.get(key);
    if (!renderFn) {
      renderFn = await this.createRenderFn(view);
      if (this.production) {
        this.cache.set(key, renderFn);
      }
    }
    return renderFn({ ...this.defaultContext, ...data });
  }

  private async createRenderFn(view: string): Promise<RenderFn> {
    const { name, module } = await this.getEngine();
    const extension = this.viewExt ?? DEFAULT_EXTENSIONS[name] ?? name;
    const file = await this.resolveFile(
      extname(view) ? view : `${view}.${extension}`,
    );
    // Express-style engines take the data and the options in one object.
    // "settings" is where Express puts application settings and where ejs
    // reads its options from ("view options"): it is set last, so data derived
    // from the request can never inject engine options through it (the ejs
    // CVE-2022-29078 vector).
    const withOptions = (data: Record<string, any>) => ({
      ...this.engineOptions,
      ...data,
      cache: this.production,
      // The Express settings engines read: hbs finds layouts and partials
      // through "views", as with Express' res.render()
      settings: {
        views: this.roots.length === 1 ? this.roots[0] : this.roots,
        'view engine': extension,
        'view options': this.engineOptions,
        'view cache': this.production,
      },
    });

    if (typeof module === 'function') {
      return data =>
        promisify(callback => module(file, withOptions(data), callback));
    }
    if (typeof module.__express === 'function') {
      return data =>
        promisify(callback =>
          module.__express(file, withOptions(data), callback),
        );
    }
    if (typeof module.compile === 'function') {
      const template = module.compile(await readFile(file, 'utf8'), {
        ...this.engineOptions,
        filename: file,
      });
      // An Eta template runs with its instance as "this", and finds relative
      // includes from the file in its options
      return data => template.call(module, data, { filepath: file });
    }
    if (typeof module.renderFile === 'function') {
      return data =>
        promisify(callback =>
          module.renderFile(file, withOptions(data), callback),
        );
    }
    throw new TypeError(
      `View engine "${name}" exposes none of __express(), compile() or renderFile().`,
    );
  }

  private async getEngine(): Promise<Engine> {
    if (!this.engine) {
      const name = this.engineName!;
      this.engine = import(name).then(
        imported => ({ name, module: imported.default ?? imported }),
        () => {
          this.engine = undefined;
          throw new Error(
            `Cannot load the "${name}" view engine; install it with "npm i ${name}".`,
          );
        },
      );
    }
    return this.engine;
  }

  private async resolveFile(view: string): Promise<string> {
    const { dir, name, ext } = parse(view);
    // "users" is "users.ext", then "users/index.ext", as with Express. Unlike
    // Express, which tries both in each directory in turn, a file in any
    // directory wins over an index
    for (const candidate of [view, join(dir, name, `index${ext}`)]) {
      for (const root of this.roots) {
        const file = resolve(root, candidate);
        // Never resolve outside the views directories ("../", absolute paths)
        const relativePath = relative(root, file);
        if (
          relativePath === '..' ||
          relativePath.startsWith(`..${sep}`) ||
          isAbsolute(relativePath)
        ) {
          continue;
        }
        try {
          // Skip a directory named like the view, as Express does
          if ((await stat(file)).isFile()) {
            return file;
          }
        } catch {
          // try the next directory, then the next candidate
        }
      }
    }
    throw new Error(
      `Failed to lookup view "${view}" in views director${
        this.roots.length > 1 ? 'ies' : 'y'
      } ${this.roots.map(root => `"${root}"`).join(', ')}`,
    );
  }
}
