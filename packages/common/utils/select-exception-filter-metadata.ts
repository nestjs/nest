import { ExceptionFilterMetadata } from '../interfaces/exceptions';

export const selectExceptionFilterMetadata = <T = any>(
  filters: ExceptionFilterMetadata[],
  exception: T,
): ExceptionFilterMetadata | undefined =>
  filters.find(
    ({ exceptionMetatypes }) =>
      !exceptionMetatypes.length ||
      exceptionMetatypes.some(
        ExceptionMetaType => exception instanceof ExceptionMetaType,
      ),
  );
