import { ExceptionHandler } from './exception-handler';

const DEFAULT_TEARDOWN = () => process.exit(1);

export class ExceptionsZone {
  private static readonly exceptionHandler = new ExceptionHandler();

  public static run(
    callback: () => void,
    teardown: (err: any) => void = DEFAULT_TEARDOWN,
  ) {
    try {
      callback();
    } catch (e) {
      this.exceptionHandler.handle(e);
      teardown(e);
    }
  }

  public static async asyncRun(
    callback: () => Promise<void>,
    teardown: (err: any) => void = DEFAULT_TEARDOWN,
  ) {
    try {
      await callback();
    } catch (e) {
      this.exceptionHandler.handle(e);
      teardown(e);
    }
  }
}
