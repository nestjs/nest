import { Controller, Get, Module, Render } from '@nestjs/common';
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
      let html = await readFile(file, 'utf8');
      for (const [, name] of html.matchAll(/\{\{> (\w+)\}\}/g)) {
        const partial = await readFile(
          join(views, 'partials', `${name}.tpl`),
          'utf8',
        );
        html = html.replace(`{{> ${name}}}`, partial);
      }
      return html.replace(/\{\{(\w+)\}\}/g, (_, key) =>
        String(options[key] ?? ''),
      );
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
}

@Module({ controllers: [ViewsController] })
export class ViewsModule {}
