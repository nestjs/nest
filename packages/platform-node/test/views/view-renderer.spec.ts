import ejs from 'ejs';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import handlebars from 'handlebars';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { ViewRenderer } from '../../views/view-renderer.js';

type Callback = (err: unknown, html?: string) => void;

describe('ViewRenderer', () => {
  let dir: string;
  let views: string;
  let renderer: ViewRenderer;

  /** Writes `content` to `file`, relative to the temporary directory. */
  const write = (file: string, content = '') => {
    const path = join(dir, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return path;
  };

  /** An Express-style `(path, data, callback)` engine echoing the path. */
  const createCallbackEngine = () =>
    vi.fn((file: string, data: Record<string, any>, callback: Callback) =>
      callback(null, file),
    );

  /** A `compile()` engine whose templates render the source and the data. */
  const createCompileEngine = () => ({
    compile: vi.fn(
      (source: string, options: Record<string, any>) =>
        (data: Record<string, any>) =>
          `${source}:${data.name}`,
    ),
  });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'nest-view-renderer-'));
    views = join(dir, 'views');
    mkdirSync(views);
    renderer = new ViewRenderer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(dir, { recursive: true, force: true });
  });

  describe('isConfigured', () => {
    it('should be false until an engine is set', () => {
      expect(renderer.isConfigured()).toBe(false);

      renderer.setEngine({ engine: { ejs } });

      expect(renderer.isConfigured()).toBe(true);
    });

    it('should be true once an engine name is set', () => {
      renderer.setEngine('ejs');

      expect(renderer.isConfigured()).toBe(true);
    });
  });

  describe('setEngine', () => {
    it('should throw a TypeError without an engine', () => {
      expect(() => renderer.setEngine({ engine: {} })).toThrow(TypeError);
      expect(renderer.isConfigured()).toBe(false);
    });
  });

  describe('engines', () => {
    it('should render with ejs, through its __express() function', async () => {
      write('views/index.ejs', 'Hello <%= name %>!');
      renderer.setEngine({ engine: { ejs }, root: views });

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        'Hello Nest!',
      );
    });

    it('should render with handlebars, through its compile() function', async () => {
      write('views/index.hbs', 'Hello {{name}}!');
      renderer.setEngine({ engine: { handlebars }, root: views });

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        'Hello Nest!',
      );
    });

    it('should call a function engine with the file, the data and a callback', async () => {
      const file = write('views/index.fn');
      const engine = vi.fn(
        (path: string, data: Record<string, any>, callback: Callback) =>
          callback(null, `<p>${data.name}</p>`),
      );
      renderer.setEngine({ engine: { fn: engine }, root: views });

      const html = await renderer.render('index', { name: 'Nest' });

      expect(html).toBe('<p>Nest</p>');
      expect(engine).toHaveBeenCalledExactlyOnceWith(
        file,
        expect.objectContaining({ name: 'Nest' }),
        expect.any(Function),
      );
    });

    it('should call __express() with the file, the data and a callback', async () => {
      const file = write('views/index.express');
      const engine = { __express: createCallbackEngine() };
      renderer.setEngine({ engine: { express: engine }, root: views });

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        file,
      );
      expect(engine.__express).toHaveBeenCalledExactlyOnceWith(
        file,
        expect.objectContaining({ name: 'Nest' }),
        expect.any(Function),
      );
    });

    it('should compile the template with the options and the filename, then render it with the data', async () => {
      const file = write('views/index.compiled', 'source');
      const engine = createCompileEngine();
      renderer.setEngine({
        engine: { compiled: engine },
        root: views,
        options: { strict: true },
      });

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        'source:Nest',
      );
      expect(engine.compile).toHaveBeenCalledExactlyOnceWith('source', {
        strict: true,
        filename: file,
      });
    });

    it('should call renderFile() with the file, the data and a callback', async () => {
      const file = write('views/index.rf');
      const engine = { renderFile: createCallbackEngine() };
      renderer.setEngine({ engine: { rf: engine }, root: views });

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        file,
      );
      expect(engine.renderFile).toHaveBeenCalledExactlyOnceWith(
        file,
        expect.objectContaining({ name: 'Nest' }),
        expect.any(Function),
      );
    });

    it('should reject with the error an engine passes to its callback', async () => {
      write('views/index.fn');
      const error = new Error('template error');
      renderer.setEngine({
        engine: {
          fn: (path: string, data: object, callback: Callback) =>
            callback(error),
        },
        root: views,
      });

      await expect(renderer.render('index')).rejects.toBe(error);
    });

    it('should reject with a TypeError for an engine exposing none of __express(), compile() or renderFile()', async () => {
      write('views/index.odd');
      renderer.setEngine({ engine: { odd: { render: vi.fn() } }, root: views });

      await expect(renderer.render('index')).rejects.toThrow(TypeError);
    });
  });

  describe('view lookup', () => {
    it('should default to the "views" directory of the working directory', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue(dir);
      const file = write('views/index.fn');
      renderer = new ViewRenderer();
      renderer.setEngine({ engine: { fn: createCallbackEngine() } });

      await expect(renderer.render('index')).resolves.toBe(file);
    });

    it.each(['root', 'templates'] as const)(
      'should search the %s directories in order',
      async option => {
        const first = join(dir, 'first');
        const second = join(dir, 'second');
        const inFirst = write('first/both.fn');
        write('second/both.fn');
        const inSecond = write('second/only-second.fn');
        renderer.setEngine({
          engine: { fn: createCallbackEngine() },
          [option]: [first, second],
        });

        await expect(renderer.render('both')).resolves.toBe(inFirst);
        await expect(renderer.render('only-second')).resolves.toBe(inSecond);
      },
    );

    it('should render a view in a subdirectory', async () => {
      const file = write('views/admin/users/list.fn');
      renderer.setEngine({
        engine: { fn: createCallbackEngine() },
        root: views,
      });

      await expect(renderer.render('admin/users/list')).resolves.toBe(file);
    });

    it.each([
      ['handlebars', 'hbs'],
      ['nunjucks', 'njk'],
      ['ejs', 'ejs'],
    ])(
      'should append the default extension of %s (.%s)',
      async (name, extension) => {
        write(`views/index.${extension}`, 'source');
        renderer.setEngine({
          engine: { [name]: createCompileEngine() },
          root: views,
        });

        await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
          'source:Nest',
        );
      },
    );

    it('should append viewExt to names without an extension', async () => {
      const file = write('views/index.html');
      write('views/index.fn');
      renderer.setEngine({
        engine: { fn: createCallbackEngine() },
        root: views,
        viewExt: 'html',
      });

      await expect(renderer.render('index')).resolves.toBe(file);
    });

    it('should keep the extension of a name that has one', async () => {
      const file = write('views/page.txt');
      renderer.setEngine({
        engine: { fn: createCallbackEngine() },
        root: views,
      });

      await expect(renderer.render('page.txt')).resolves.toBe(file);
    });

    it('should reject a view that does not exist', async () => {
      const engine = createCallbackEngine();
      renderer.setEngine({ engine: { fn: engine }, root: views });

      await expect(renderer.render('missing')).rejects.toThrow(
        'Failed to lookup view',
      );
      expect(engine).not.toHaveBeenCalled();
    });

    it.each([
      ['a relative path', () => '../secret'],
      ['an absolute path', () => join(dir, 'secret')],
      ['a sibling directory sharing its prefix', () => '../views-secret/page'],
    ])(
      'should not render %s resolving outside the views directories',
      async (_, getView) => {
        write('secret.fn', 'secret');
        write('views-secret/page.fn', 'secret');
        const engine = createCallbackEngine();
        renderer.setEngine({ engine: { fn: engine }, root: views });

        await expect(renderer.render(getView())).rejects.toThrow(
          'Failed to lookup view',
        );
        expect(engine).not.toHaveBeenCalled();
      },
    );
  });

  describe('data', () => {
    it('should merge defaultContext under the render data', async () => {
      write('views/index.fn');
      const engine = createCallbackEngine();
      const defaultContext = { title: 'Default', site: 'Nest' };
      renderer.setEngine({
        engine: { fn: engine },
        root: views,
        defaultContext,
      });

      await renderer.render('index', { title: 'Page' });

      expect(engine.mock.calls[0][1]).toMatchObject({
        title: 'Page',
        site: 'Nest',
      });
      expect(defaultContext).toEqual({ title: 'Default', site: 'Nest' });
    });

    it('should pass the options to an ejs-style engine as "view options"', async () => {
      // ejs reads these two only from "view options", never from the data
      write('views/index.ejs', 'Hello [%= name %]!');
      renderer.setEngine({
        engine: { ejs },
        root: views,
        options: { openDelimiter: '[', closeDelimiter: ']' },
      });

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        'Hello Nest!',
      );
    });

    it('should pass the options to a compile() engine', async () => {
      write('views/index.hbs', '{{name}}');
      renderer.setEngine({
        engine: { handlebars },
        root: views,
        options: { noEscape: true },
      });

      await expect(
        renderer.render('index', { name: '<b>Nest</b>' }),
      ).resolves.toBe('<b>Nest</b>');
    });

    it('should not let the data override the settings passed to the engine', async () => {
      write('views/index.express');
      const engine = { __express: createCallbackEngine() };
      const options = { rmWhitespace: true };
      renderer.setEngine({
        engine: { express: engine },
        root: views,
        options,
        production: false,
      });

      await renderer.render('index', {
        name: 'Nest',
        settings: {
          'view options': { client: true, escapeFunction: 'evil()' },
          'view cache': true,
        },
      });

      const data = engine.__express.mock.calls[0][1];
      expect(data.name).toBe('Nest');
      expect(data.settings).toEqual({
        'view options': options,
        'view cache': false,
      });
    });

    it('should not let the data inject ejs options through "settings" (CVE-2022-29078)', async () => {
      write('views/index.ejs', 'Hello <%= name %>!');
      renderer.setEngine({ engine: { ejs }, root: views });

      const html = await renderer.render('index', {
        name: 'Nest',
        settings: {
          'view options': { openDelimiter: '[', closeDelimiter: ']' },
        },
      });

      expect(html).toBe('Hello Nest!');
    });
  });

  describe('caching', () => {
    it('should resolve and compile a view once with production: true', async () => {
      write('views/index.compiled', 'source');
      const engine = createCompileEngine();
      renderer.setEngine({
        engine: { compiled: engine },
        root: views,
        production: true,
      });

      await expect(renderer.render('index', { name: 'a' })).resolves.toBe(
        'source:a',
      );
      rmSync(join(views, 'index.compiled'));
      await expect(renderer.render('index', { name: 'b' })).resolves.toBe(
        'source:b',
      );
      expect(engine.compile).toHaveBeenCalledTimes(1);
    });

    it('should resolve and compile a view on every render with production: false', async () => {
      write('views/index.compiled', 'source');
      const engine = createCompileEngine();
      renderer.setEngine({
        engine: { compiled: engine },
        root: views,
        production: false,
      });

      await renderer.render('index', { name: 'a' });
      await renderer.render('index', { name: 'b' });

      expect(engine.compile).toHaveBeenCalledTimes(2);
    });

    it('should pick up template changes with production: false', async () => {
      write('views/index.hbs', 'first {{name}}');
      renderer.setEngine({
        engine: { handlebars },
        root: views,
        production: false,
      });

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        'first Nest',
      );
      write('views/index.hbs', 'second {{name}}');
      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        'second Nest',
      );
    });

    it('should cache when NODE_ENV is "production" by default', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      write('views/index.compiled', 'source');
      const engine = createCompileEngine();
      renderer = new ViewRenderer();
      renderer.setEngine({ engine: { compiled: engine }, root: views });

      await renderer.render('index', { name: 'a' });
      await renderer.render('index', { name: 'b' });

      expect(engine.compile).toHaveBeenCalledTimes(1);
    });

    it('should drop the cached views when the views directory changes', async () => {
      const inFirst = write('first/index.fn');
      const inSecond = write('second/index.fn');
      renderer.setEngine({
        engine: { fn: createCallbackEngine() },
        root: join(dir, 'first'),
        production: true,
      });

      await expect(renderer.render('index')).resolves.toBe(inFirst);
      renderer.setBaseViewsDir(join(dir, 'second'));
      await expect(renderer.render('index')).resolves.toBe(inSecond);
    });
  });

  describe('engine names', () => {
    it('should load the engine module on the first render', async () => {
      write('views/index.ejs', 'Hello <%= name %>!');
      renderer.setEngine('ejs');
      renderer.setBaseViewsDir(views);

      await expect(renderer.render('index', { name: 'Nest' })).resolves.toBe(
        'Hello Nest!',
      );
    });

    it('should reject with a clear error when the engine cannot be loaded', async () => {
      write('views/index.nest-missing-view-engine');
      renderer.setEngine('nest-missing-view-engine');
      renderer.setBaseViewsDir(views);

      await expect(renderer.render('index')).rejects.toThrow(
        'Cannot load the "nest-missing-view-engine" view engine',
      );
      await expect(renderer.render('index')).rejects.toThrow(
        'Cannot load the "nest-missing-view-engine" view engine',
      );
    });
  });
});
