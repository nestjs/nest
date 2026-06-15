export interface PromiseDelayedSseStats {
  closeEventsObserved: number;
  requestsStarted: number;
  runningStreams: number;
  subscriptionsStarted: number;
  teardownsObserved: number;
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const fetchPromiseDelayedSseStats = async (
  appUrl: string,
): Promise<PromiseDelayedSseStats> => {
  const response = await fetch(`${appUrl}/sse/promise-delayed/stats`);
  return response.json();
};

export const releasePromiseDelayedSse = async (appUrl: string) => {
  const response = await fetch(`${appUrl}/sse/promise-delayed/release`, {
    method: 'POST',
  });
  const { released } = await response.json();

  return released as number;
};

const waitForPromiseDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: PromiseDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    const stats = await fetchPromiseDelayedSseStats(appUrl);

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

  throw new Error(timeoutErrorMessage);
};

export const waitForPromiseDelayedSseRequestStart = async (appUrl: string) => {
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the delayed SSE request to start.',
  );
};

export const waitForPromiseDelayedSseClose = async (appUrl: string) => {
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.closeEventsObserved > 0,
    'Timed out waiting for the delayed SSE request to close.',
  );
};

export const waitForPromiseDelayedSseTeardown = async (appUrl: string) => {
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the delayed SSE teardown to run.',
  );
};
