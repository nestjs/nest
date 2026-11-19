/**
 * @publicApi
 */
export class MaxPendingRequestsExceededException extends Error {
  constructor(public readonly maxPendingRequests: number) {
    super(
      `Maximum number of pending requests (${maxPendingRequests}) exceeded`,
    );
    this.name = MaxPendingRequestsExceededException.name;
  }
}
