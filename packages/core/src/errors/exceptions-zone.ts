import { ExceptionsHandler } from './exceptions-handler';
import { UNHANDLED_RUNTIME_EXCEPTION } from './messages';

export class ExceptionsZone {
  private static readonly exceptionHandler = new ExceptionsHandler();

  public static async run(zone: () => Promise<void>) {
    try {
      await zone();
    } catch (e) {
      this.exceptionHandler.handle(e);
      throw UNHANDLED_RUNTIME_EXCEPTION;
    }
  }
}
