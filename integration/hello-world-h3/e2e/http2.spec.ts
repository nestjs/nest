import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { expect } from 'chai';
import * as http2 from 'http2';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Generate self-signed certificates for testing
// In real tests, you would use proper test certificates
const generateTestCertificates = () => {
  // Use the test certificates if available, otherwise skip the test
  const certPath = path.join(__dirname, '..', 'certs');
  const keyPath = path.join(certPath, 'key.pem');
  const certFilePath = path.join(certPath, 'cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certFilePath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certFilePath),
    };
  }

  // Generate certificates on the fly for testing using openssl
  // This is a fallback for environments without pre-generated certs
  return null;
};

@Controller('test')
class TestController {
  @Get()
  test() {
    return { message: 'Hello HTTP/2!' };
  }

  @Get('headers')
  headers() {
    return { headers: 'test' };
  }
}

describe('HTTP/2 Support (H3 adapter)', () => {
  let app: NestH3Application;
  let certs: { key: Buffer; cert: Buffer } | null;

  before(() => {
    certs = generateTestCertificates();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('HTTP/2 Configuration', () => {
    it('should report isHttp2Enabled as false by default', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();

      const adapter = app.getHttpAdapter() as H3Adapter;
      expect(adapter.isHttp2Enabled()).to.be.false;
    });

    it('should create HTTP/1.1 server by default', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();

      const server = app.getHttpServer();
      // HTTP/1.1 server should not have the 'timeout' method specific to http2
      expect(server.constructor.name).to.not.include('Http2');
    });
  });

  describe('HTTP/2 Cleartext (h2c)', function () {
    // h2c tests - for server-to-server communication

    it('should initialize h2c server when http2Options is set without TLS', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const adapter = new H3Adapter();
      app = moduleRef.createNestApplication<NestH3Application>(adapter, {
        http2Options: { http2: true },
      } as any);

      await app.init();

      expect((app.getHttpAdapter() as H3Adapter).isHttp2Enabled()).to.be.true;
    });

    it('should handle requests over h2c', async function () {
      this.timeout(5000);

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const adapter = new H3Adapter();
      app = moduleRef.createNestApplication<NestH3Application>(adapter, {
        http2Options: { http2: true },
      } as any);

      await app.init();

      const server = app.getHttpServer();
      await new Promise<void>(resolve => server.listen(0, resolve));
      const port = (server.address() as any).port;

      // Make HTTP/2 cleartext request
      const response = await new Promise<{
        status: number;
        body: string;
        headers: http2.IncomingHttpHeaders;
      }>((resolve, reject) => {
        const client = http2.connect(`http://localhost:${port}`);

        client.on('error', reject);

        const req = client.request({
          ':method': 'GET',
          ':path': '/test',
        });

        let data = '';
        let status: number;
        let headers: http2.IncomingHttpHeaders;

        req.on('response', hdrs => {
          headers = hdrs;
          status = hdrs[':status'] as number;
        });

        req.on('data', chunk => {
          data += chunk.toString();
        });

        req.on('end', () => {
          client.close();
          resolve({ status, body: data, headers });
        });

        req.on('error', reject);
        req.end();
      });

      expect(response.status).to.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        message: 'Hello HTTP/2!',
      });
    });
  });

  describe('HTTP/2 Secure (h2)', function () {
    // h2 tests - requires TLS certificates

    beforeEach(function () {
      if (!certs) {
        this.skip();
      }
    });

    it('should initialize h2 server when http2Options and httpsOptions are set', async function () {
      if (!certs) {
        this.skip();
        return;
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const adapter = new H3Adapter();
      app = moduleRef.createNestApplication<NestH3Application>(adapter, {
        httpsOptions: certs,
        http2Options: { http2: true, allowHTTP1: true },
      } as any);

      await app.init();

      expect((app.getHttpAdapter() as H3Adapter).isHttp2Enabled()).to.be.true;
    });

    it('should handle HTTP/2 requests over TLS', async function () {
      if (!certs) {
        this.skip();
        return;
      }

      this.timeout(5000);

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const adapter = new H3Adapter();
      app = moduleRef.createNestApplication<NestH3Application>(adapter, {
        httpsOptions: certs,
        http2Options: { http2: true, allowHTTP1: true },
      } as any);

      await app.init();

      const server = app.getHttpServer();
      await new Promise<void>(resolve => server.listen(0, resolve));
      const port = (server.address() as any).port;

      // Make HTTP/2 secure request
      const response = await new Promise<{
        status: number;
        body: string;
        headers: http2.IncomingHttpHeaders;
      }>((resolve, reject) => {
        const client = http2.connect(`https://localhost:${port}`, {
          rejectUnauthorized: false, // Accept self-signed certs for testing
        });

        client.on('error', reject);

        const req = client.request({
          ':method': 'GET',
          ':path': '/test',
        });

        let data = '';
        let status: number;
        let headers: http2.IncomingHttpHeaders;

        req.on('response', hdrs => {
          headers = hdrs;
          status = hdrs[':status'] as number;
        });

        req.on('data', chunk => {
          data += chunk.toString();
        });

        req.on('end', () => {
          client.close();
          resolve({ status, body: data, headers });
        });

        req.on('error', reject);
        req.end();
      });

      expect(response.status).to.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        message: 'Hello HTTP/2!',
      });
    });

    it('should allow HTTP/1.1 fallback when allowHTTP1 is true', async function () {
      if (!certs) {
        this.skip();
        return;
      }

      this.timeout(5000);

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const adapter = new H3Adapter();
      app = moduleRef.createNestApplication<NestH3Application>(adapter, {
        httpsOptions: certs,
        http2Options: { http2: true, allowHTTP1: true },
      } as any);

      await app.init();

      const server = app.getHttpServer();
      await new Promise<void>(resolve => server.listen(0, resolve));
      const port = (server.address() as any).port;

      // Make HTTP/1.1 request to HTTP/2 server with ALPN fallback
      const response = await new Promise<{
        status: number;
        body: string;
      }>((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port,
          path: '/test',
          method: 'GET',
          rejectUnauthorized: false,
        };

        const req = https.request(options, res => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode!, body: data });
          });
        });

        req.on('error', reject);
        req.end();
      });

      expect(response.status).to.equal(200);
      expect(JSON.parse(response.body)).to.deep.equal({
        message: 'Hello HTTP/2!',
      });
    });
  });
});
