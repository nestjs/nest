import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NestNodeApplication } from '@nestjs/platform-node';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import {
  partialsEngine,
  VIEWS_DIR,
  ViewsModule,
} from '../src/views/views.module.js';

// @Render() through an Express-style engine (hbs, ejs, ...), which reads the
// views directory from the settings Express passes to `__express()`
describe.each(adapters('express', 'node'))('@Render() (%s)', name => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createApp(name, ViewsModule, app => {
      app.use(
        (req: unknown, res: { locals: any }, next: (err?: unknown) => void) => {
          res.locals.user = 'Kamil';
          // The data the handler returns wins
          res.locals.message = 'Bye';
          next();
        },
      );
      if (name === 'express') {
        const expressApp = app as NestExpressApplication;
        expressApp.engine('tpl', partialsEngine.__express);
        expressApp.setBaseViewsDir(VIEWS_DIR);
        expressApp.setViewEngine('tpl');
      } else {
        const nodeApp = app as NestNodeApplication;
        nodeApp.setBaseViewsDir(VIEWS_DIR);
        nodeApp.setViewEngine({ engine: { tpl: partialsEngine } });
      }
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should render the view, with the partials the engine finds through the views directory', async () => {
    const res = await request(app.getHttpServer()).get('/page');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.text).toBe('<h1>Hello</h1><footer>2026</footer>');
  });

  it('should pass res.locals to the view, under the data the handler returns', async () => {
    const res = await request(app.getHttpServer()).get('/locals');

    expect(res.status).toBe(200);
    expect(res.text).toBe('<p>Hello Kamil</p>');
  });
});
