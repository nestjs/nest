import { INestApplication } from '@nestjs/common';
import { IncomingMessage, request, RequestOptions } from 'http';

export const getHttpBaseOptions = async (
  app: INestApplication,
): Promise<RequestOptions> => {
  const url = await app.getUrl();
  // replace IPv6 localhost with IPv4 localhost alias and split URL on : to get the protocol (http), the host (localhost) and the port (random port)
  const [protocol, host, port] = url.replace('[::1]', 'localhost').split(':');
  return {
    // protocol is expected to be http: or https:
    protocol: `${protocol}:`,
    // remove the // prefix left over from the split(':')
    host: host.replace('//', ''),
    port,
    method: 'GET',
  };
};

export const sendCanceledHttpRequest = async (
  options: RequestOptions,
  path: string,
) => {
  return new Promise((resolve, reject) => {
    const req = request({ ...options, path }, res => {
      // close the request once we get the first response of data
      res.on('data', () => {
        req.destroy();
      });
      // response is closed, move on to next request and verify it's doable
      res.on('close', resolve);
    });
    // fire the request
    req.end();
  });
};

export const sendHttpRequest = async (
  options: RequestOptions,
  path: string,
) => {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const req = request({ ...options, path }, res => {
      // this makes sure that the response actually starts and is read. We could verify this value against the same
      // that is in an earlier test, but all we care about in _this_ test is that the status code is 200
      res.on('data', chunk => {
        /* no op */
      });
      // fail the test if somethin goes wrong
      res.on('error', err => {
        reject(err);
      });
      // pass the response back so we can verify values in the test
      res.on('end', () => {
        resolve(res);
      });
    });
    // fire the request
    req.end();
  });
};
