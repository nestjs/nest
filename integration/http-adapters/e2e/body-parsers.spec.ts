import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { BodyParsersModule } from '../src/body-parsers/body-parsers.module.js';

// The Node adapter's parsers follow body-parser 2 (the Express adapter's):
// the same charsets, limits and options, with the same results. Fastify has
// its own content type parsers and options.
describe.each(adapters('express', 'node'))('Body parsers (%s)', name => {
  let app: INestApplication;
  // The body as given: supertest would otherwise serialize a Buffer for JSON
  // and form content types
  const post = (contentType: string, body: string | Buffer) =>
    request(app.getHttpServer())
      .post('/echo')
      .set('content-type', contentType)
      .serialize((raw: any) => raw)
      .send(body as any);

  afterEach(async () => {
    await app.close();
  });

  describe('charsets', () => {
    beforeEach(async () => {
      app = await createApp(name, BodyParsersModule, app =>
        (app as any).useBodyParser('text'),
      );
    });

    const latin1 = (text: string) => Buffer.from(text, 'latin1');

    it('should read the charset of a Content-Type with a trailing ";"', async () => {
      const form = await post(
        'application/x-www-form-urlencoded; charset=iso-8859-1;',
        latin1('a=café'),
      );
      const text = await post(
        'text/plain; charset=iso-8859-1;',
        latin1('café'),
      );

      expect(form.text).toBe('{"a":"café"}');
      expect(text.text).toBe('café');
    });

    it('should take the first of two charset parameters', async () => {
      const res = await post(
        'text/plain; charset=iso-8859-1; charset=utf-8',
        latin1('café'),
      );

      expect(res.text).toBe('café');
    });

    it('should read upper-case, spaced and quoted charset parameters', async () => {
      for (const contentType of [
        'text/plain; CHARSET=ISO-8859-1',
        'text/plain; charset = iso-8859-1',
        'text/plain;charset="iso-8859-1"',
      ]) {
        expect((await post(contentType, latin1('café'))).text).toBe('café');
      }
    });

    it('should match the media type case-insensitively', async () => {
      expect((await post('Application/JSON', '{"a":1}')).text).toBe('{"a":1}');
    });

    it('should read JSON in any utf-* charset', async () => {
      const res = await post(
        'application/json; charset=utf-16le',
        Buffer.from('{"a":"é"}', 'utf16le'),
      );

      expect(res.text).toBe('{"a":"é"}');
    });

    it('should pick the byte order of "utf-16" from the byte order mark, or else the content', async () => {
      const withBom = await post(
        'text/plain; charset=utf-16',
        Buffer.from([0xfe, 0xff, 0, 0x68, 0, 0x69]),
      );
      const bigEndian = await post(
        'text/plain; charset=utf-16',
        Buffer.from([0, 0x68, 0, 0x69]),
      );

      expect(withBom.text).toBe('hi');
      expect(bigEndian.text).toBe('hi');
    });

    it.each([
      ['application/json; charset=iso-8859-1', 'ISO-8859-1'],
      ['application/x-www-form-urlencoded; charset=utf-16', 'UTF-16'],
      ['text/plain; charset=x-unknown', 'X-UNKNOWN'],
    ])(
      'should answer an unsupported charset (%s) with 415',
      async (contentType, charset) => {
        const res = await post(contentType, 'a=1');

        expect(res.status).toBe(415);
        expect(res.body).toEqual({
          statusCode: 415,
          message: `unsupported charset "${charset}"`,
        });
      },
    );
  });

  describe('limits', () => {
    it.each([Infinity, '1tb', '2PB'])(
      'should accept the limit %s',
      async limit => {
        app = await createApp(
          name,
          BodyParsersModule,
          app => (app as any).useBodyParser('json', { limit }),
          { bodyParser: false },
        );

        const res = await post(
          'application/json',
          JSON.stringify({ data: 'x'.repeat(200 * 1024) }),
        );

        expect(res.status).toBe(201);
      },
    );

    it('should answer a body over the limit with 413', async () => {
      app = await createApp(
        name,
        BodyParsersModule,
        app => (app as any).useBodyParser('json', { limit: 10 }),
        { bodyParser: false },
      );

      const res = await post('application/json', '{"a":"xxxxxxxxxx"}');

      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        statusCode: 413,
        message: 'request entity too large',
      });
    });
  });

  describe('urlencoded charset options', () => {
    const create = (options: object) =>
      createApp(
        name,
        BodyParsersModule,
        app => (app as any).useBodyParser('urlencoded', options),
        { bodyParser: false },
      );
    const form = 'application/x-www-form-urlencoded';

    it('should decode a body without a charset with defaultCharset', async () => {
      app = await create({ defaultCharset: 'iso-8859-1' });

      const res = await post(form, Buffer.from('a=café&b=caf%E9', 'latin1'));

      expect(res.text).toBe('{"a":"café","b":"café"}');
    });

    it('should pick the charset from a "utf8" sentinel with charsetSentinel', async () => {
      app = await create({
        defaultCharset: 'iso-8859-1',
        charsetSentinel: true,
      });

      const res = await post(form, 'utf8=%E2%9C%93&a=caf%C3%A9');

      expect(res.text).toBe('{"a":"café"}');
    });

    it('should decode numeric entities with interpretNumericEntities', async () => {
      app = await create({
        defaultCharset: 'iso-8859-1',
        interpretNumericEntities: true,
      });

      const res = await post(form, 'a=%26%239786%3B');

      expect(res.text).toBe('{"a":"☺"}');
    });
  });
});
