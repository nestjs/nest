import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { HttpStatus } from '../../enums';
import { HttpException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ParseIPPipe } from '../../pipes/parse-ip.pipe';
chai.use(chaiAsPromised);

class TestException extends HttpException {
  constructor() {
    super('This is a TestException', HttpStatus.I_AM_A_TEAPOT);
  }
}

describe('ParseIPPipe', () => {
  let target: ParseIPPipe;
  const exceptionFactory = (error: any) => new TestException();

  describe('transform', () => {
    const validIPv4 = [
      '192.168.1.1',
      '10.0.0.1',
      '172.16.0.1',
      '255.255.255.255',
      '0.0.0.0',
      '1.1.1.1',
    ];
    const validIPv6 = [
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      '2001:db8:85a3::8a2e:370:7334',
      '::1',
      '::',
      'fe80::1',
      '2001:db8::',
      '::ffff:192.0.2.1',
    ];
    const invalidIPs = [
      'not-an-ip',
      '192.168.1',
      '192.168.1.256',
      '192.168.01.1',
      '192.168.1.1.1',
      '2001:db8::8a2e:370:7334:1234:5678:9abc',
      '2001:db8:::1',
      'g:g:g:g:g:g:g:g',
    ];

    describe('when validation passes', () => {
      it('should return string if value is valid IPv4', async () => {
        target = new ParseIPPipe({ exceptionFactory });
        for (const ip of validIPv4) {
          expect(await target.transform(ip, {} as ArgumentMetadata)).to.equal(
            ip,
          );
        }
      });

      it('should return string if value is valid IPv6', async () => {
        target = new ParseIPPipe({ exceptionFactory });
        for (const ip of validIPv6) {
          expect(await target.transform(ip, {} as ArgumentMetadata)).to.equal(
            ip,
          );
        }
      });

      it('should return string if value is valid IPv4 and version is 4', async () => {
        target = new ParseIPPipe({ version: '4', exceptionFactory });
        for (const ip of validIPv4) {
          expect(await target.transform(ip, {} as ArgumentMetadata)).to.equal(
            ip,
          );
        }
      });

      it('should return string if value is valid IPv6 and version is 6', async () => {
        target = new ParseIPPipe({ version: '6', exceptionFactory });
        for (const ip of validIPv6) {
          expect(await target.transform(ip, {} as ArgumentMetadata)).to.equal(
            ip,
          );
        }
      });

      it('should not throw an error if the value is undefined and optional is true', async () => {
        const target = new ParseIPPipe({ optional: true });
        const value = await target.transform(
          undefined!,
          {} as ArgumentMetadata,
        );
        expect(value).to.equal(undefined);
      });

      it('should not throw an error if the value is null and optional is true', async () => {
        const target = new ParseIPPipe({ optional: true });
        const value = await target.transform(null!, {} as ArgumentMetadata);
        expect(value).to.equal(null);
      });
    });

    describe('when validation fails', () => {
      it('should throw an error for invalid IP strings', async () => {
        target = new ParseIPPipe({ exceptionFactory });
        for (const ip of invalidIPs) {
          await expect(
            target.transform(ip, {} as ArgumentMetadata),
          ).to.be.rejectedWith(TestException);
        }
      });

      it('should throw an error for IPv6 when version is 4', async () => {
        target = new ParseIPPipe({ version: '4', exceptionFactory });
        for (const ip of validIPv6) {
          await expect(
            target.transform(ip, {} as ArgumentMetadata),
          ).to.be.rejectedWith(TestException);
        }
      });

      it('should throw an error for IPv4 when version is 6', async () => {
        target = new ParseIPPipe({ version: '6', exceptionFactory });
        for (const ip of validIPv4) {
          await expect(
            target.transform(ip, {} as ArgumentMetadata),
          ).to.be.rejectedWith(TestException);
        }
      });

      it('should throw an error - not a string', async () => {
        target = new ParseIPPipe({ exceptionFactory });
        await expect(
          target.transform(undefined!, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
        await expect(
          target.transform(null!, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
      });

      it('should use custom exceptionFactory', async () => {
        const customExceptionFactory = (error: string) => {
          return new HttpException(
            'Custom error: ' + error,
            HttpStatus.BAD_REQUEST,
          );
        };
        target = new ParseIPPipe({ exceptionFactory: customExceptionFactory });
        try {
          await target.transform('invalid-ip', {} as ArgumentMetadata);
          expect.fail('Should have thrown an exception');
        } catch (error: any) {
          expect(error.message).to.include('Custom error');
          expect(error.getStatus()).to.equal(HttpStatus.BAD_REQUEST);
        }
      });

      it('should have correct error message without version', async () => {
        let caughtError: any;
        target = new ParseIPPipe();
        try {
          await target.transform('invalid-ip', {} as ArgumentMetadata);
        } catch (error: any) {
          caughtError = error;
        }
        expect(caughtError.message).to.equal(
          'Validation failed (ip address is expected)',
        );
      });

      it('should have correct error message with version 4', async () => {
        let caughtError: any;
        target = new ParseIPPipe({ version: '4' });
        try {
          await target.transform('2001:db8::1', {} as ArgumentMetadata);
        } catch (error: any) {
          caughtError = error;
        }
        expect(caughtError.message).to.equal(
          'Validation failed (ip v4 address is expected)',
        );
      });

      it('should have correct error message with version 6', async () => {
        let caughtError: any;
        target = new ParseIPPipe({ version: '6' });
        try {
          await target.transform('192.168.1.1', {} as ArgumentMetadata);
        } catch (error: any) {
          caughtError = error;
        }
        expect(caughtError.message).to.equal(
          'Validation failed (ip v6 address is expected)',
        );
      });
    });
  });
});
