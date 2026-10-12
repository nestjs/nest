import { extname, join, resolve } from 'node:path';
import type {
  NestBunViewEngine,
  NestBunViewEngineOption,
} from '../../interfaces/nest-bun-view-engine.interface.js';

export class ViewRenderer {
  private engine: NestBunViewEngine | null = null;
  private dirs: string[] = [resolve('views')];
  /** App-level template globals (`app.setLocal()`), merged under per-render data. */
  public readonly locals: Record<string, unknown> = {};

  public setEngine(engine: NestBunViewEngineOption | string): void {
    this.engine =
      typeof engine === 'string'
        ? builtin(engine as 'ejs' | 'hbs' | 'handlebars' | 'pug')
        : engine;
  }

  public setDirs(dirs: string | string[]): void {
    this.dirs = (Array.isArray(dirs) ? dirs : [dirs]).map(d => resolve(d));
  }

  public get configured(): boolean {
    return this.engine !== null;
  }

  public async render(view: string, data: object): Promise<string> {
    if (!this.engine) {
      throw new Error(
        'No view engine configured. Call app.setViewEngine() first.',
      );
    }
    const ext = this.engine.extension;
    const name = ext && !extname(view) ? `${view}.${ext}` : view;
    for (const dir of this.dirs) {
      const file = join(dir, name);
      if (await Bun.file(file).exists()) {
        return this.engine.render(file, { ...this.locals, ...data });
      }
    }
    throw new Error(`View "${view}" not found in ${this.dirs.join(', ')}`);
  }
}

function builtin(
  name: 'ejs' | 'hbs' | 'handlebars' | 'pug',
): NestBunViewEngine {
  switch (name) {
    default:
      throw new Error(
        `Unknown view engine "${name}". Pass an object with a render() method for custom engines.`,
      );
    case 'ejs':
      return {
        extension: 'ejs',
        async render(file, data) {
          const ejs = await load('ejs');
          return ejs.renderFile(file, data, { async: true });
        },
      };
    case 'hbs':
    case 'handlebars':
      return {
        extension: 'hbs',
        async render(file, data) {
          const hbs = await load('handlebars');
          return hbs.compile(await Bun.file(file).text())(data);
        },
      };
    case 'pug':
      return {
        extension: 'pug',
        async render(file, data) {
          const pug = await load('pug');
          return pug.renderFile(file, data as Record<string, unknown>);
        },
      };
  }
}

async function load(pkg: string): Promise<any> {
  try {
    const mod = await import(pkg);
    return mod.default ?? mod;
  } catch {
    throw new Error(
      `View engine "${pkg}" is not installed. Run: bun add ${pkg}`,
    );
  }
}
