import { createApp } from '../src/main';

let server: any;

export default async function handler(req: any, res: any) {
  if (!server) {
    const app = await createApp();
    await app.init();
    server = app.getHttpAdapter().getInstance();
  }

  return server(req, res);
}
