/**
 * Exception that represents an intrinsic error in the application.
 * When thrown, the default exception filter will not log the error message.
 *
 * @publicApi
 */
export class IntrinsicException extends Error {}
