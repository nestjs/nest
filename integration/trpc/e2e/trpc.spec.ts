import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';

describe('tRPC Integration (Express)', () => {
    let app: any;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        await app.listen(0);
    });

    afterEach(async () => {
        await app.close();
    });

    it('should respond to tRPC query via GET', async () => {
        const server = app.getHttpServer();
        const response = await new Promise<any>((resolve, reject) => {
            const http = require('http');
            const req = http.request(
                {
                    hostname: 'localhost',
                    port: server.address().port,
                    path: '/trpc/users.list',
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                },
                (res: any) => {
                    let data = '';
                    res.on('data', (chunk: string) => (data += chunk));
                    res.on('end', () => {
                        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                    });
                },
            );
            req.on('error', reject);
            req.end();
        });

        expect(response.statusCode).to.equal(200);
        expect(response.body.result.data).to.be.an('array');
    });

    it('should respond to tRPC mutation via POST', async () => {
        const server = app.getHttpServer();
        const port = server.address().port;

        const response = await new Promise<any>((resolve, reject) => {
            const http = require('http');
            const body = JSON.stringify({
                name: 'Charlie',
                email: 'charlie@example.com',
            });
            const req = http.request(
                {
                    hostname: 'localhost',
                    port,
                    path: '/trpc/users.create',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                    },
                },
                (res: any) => {
                    let data = '';
                    res.on('data', (chunk: string) => (data += chunk));
                    res.on('end', () => {
                        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                    });
                },
            );
            req.on('error', reject);
            req.write(body);
            req.end();
        });

        expect(response.statusCode).to.equal(200);
        expect(response.body.result.data).to.have.property('name', 'Charlie');
    });
});
