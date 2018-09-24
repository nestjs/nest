export const createHttpExceptionBody = (
  message: any,
  error: string,
  statusCode: number,
) => (message ? { statusCode, error, message } : { statusCode, error });
