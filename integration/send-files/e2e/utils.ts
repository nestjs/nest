import { INestApplication } from '@nestjs/common';
import { IncomingMessage, request } from 'http';
import { URL } from 'url';

export const getHttpBaseOptions = async (
  app: INestApplication,
): Promise<URL> => {
  const url = await app.getUrl();
  return new URL(url);
};

export const sendCanceledHttpRequest = async (url: URL) => {
  return new Promise(resolve => {
    const req = request(url, res => {
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

export const sendHttpRequest = async (url: URL) => {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const req = request(url, res => {
      // this makes sure that the response actually starts and is read. We could verify this value against the same
      // that is in an earlier test, but all we care about in _this_ test is that the status code is 200
      res.on('data', () => {
        // no op
      });
      // fail the test if something goes wrong
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
