import { Controller, Get, Module, Param, Query, Render } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

export const VIEWS_DIR = fileURLToPath(new URL('./templates', import.meta.url));

/**
 * A minimal Express-style view engine (`__express(file, options, callback)`)
 * that, like hbs and ejs, finds its partials ("{{> name}}") through the
 * views directory Express passes in `options.settings.views`.
 */
export const partialsEngine = {
  __express(
    file: string,
    options: Record<string, any>,
    callback: (err: unknown, html?: string) => void,
  ) {
    const render = async () => {
      const views: string = [].concat(options.settings.views)[0];
      const source = await readFile(file, 'utf8');
      let html = source;
      for (const [, name] of html.matchAll(/\{\{> (\w+)\}\}/g)) {
        const partial = await readFile(
          join(views, 'partials', `${name}.tpl`),
          'utf8',
        );
        html = html.replace(`{{> ${name}}}`, partial);
      }
      try {
        return html
          .replace(/\{\{!.*?\}\}\n?/g, '')
          .replace(/\{\{decode (\w+)\}\}/g, (_, key) =>
            decodeURIComponent(String(options[key] ?? '')),
          )
          .replace(/\{\{(\w+)\}\}/g, (_, key) => String(options[key] ?? ''));
      } catch (err) {
        // Like ejs, which adds the path and lines of the view to the
        // message of what a view throws
        (err as Error).message =
          `${file}\n${source}\n${(err as Error).message}`;
        throw err;
      }
    };
    render().then(html => callback(null, html), callback);
  },
};

@Controller()
export class ViewsController {
  @Get('page')
  @Render('index')
  page() {
    return { message: 'Hello', year: 2026 };
  }

  @Get('locals')
  @Render('locals')
  locals() {
    return { message: 'Hello' };
  }

  @Get('section')
  @Render('section')
  section() {
    return { message: 'Hello' };
  }

  @Get('decode')
  @Render('decode')
  decode(@Query('next') next: string) {
    return { next };
  }

  @Get('pages/:name')
  @Render('index')
  named(@Param('name') name: string) {
    return { message: name, year: 2026 };
  }
}

@Module({ controllers: [ViewsController] })
export class ViewsModule {}
