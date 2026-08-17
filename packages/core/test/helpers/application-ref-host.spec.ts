import { HttpAdapterHost } from '../../helpers/http-adapter-host.js';

describe('HttpAdapterHost', () => {
  let applicationRefHost: HttpAdapterHost;
  beforeEach(() => {
    applicationRefHost = new HttpAdapterHost();
  });

  it('should wrap application reference', () => {
    const ref = {};
    applicationRefHost.httpAdapter = ref as any;

    expect(applicationRefHost.httpAdapter).toEqual(ref);
  });

  it('should emit listen event when listening is set to true', () =>
    new Promise<void>(done => {
      applicationRefHost.listen$.subscribe(() => {
        expect(applicationRefHost.listening).toBe(true);
        done();
      });
      applicationRefHost.listening = true;
    }));

  it('listening should return false if the application isnt listening yet', () => {
    expect(applicationRefHost.listening).toBe(false);
  });
});
