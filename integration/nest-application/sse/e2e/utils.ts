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

export interface InterceptorDelayedSseStats {
  closeEventsObserved: number;
  requestsStarted: number;
  runningStreams: number;
  subscriptionsStarted: number;
  teardownsObserved: number;
}

export const fetchInterceptorDelayedSseStats = async (
  appUrl: string,
): Promise<InterceptorDelayedSseStats> => {
  const response = await fetch(
    `${appUrl}/sse/interceptor/promise-delayed/stats`,
  );
  return response.json();
};

export const releaseInterceptorDelayedSse = async (appUrl: string) => {
  const response = await fetch(
    `${appUrl}/sse/interceptor/promise-delayed/release`,
    { method: 'POST' },
  );
  const { released } = await response.json();

  return released as number;
};

const waitForInterceptorDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: InterceptorDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    const stats = await fetchInterceptorDelayedSseStats(appUrl);

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

  throw new Error(timeoutErrorMessage);
};

export const waitForInterceptorDelayedSseRequestStart = async (
  appUrl: string,
) => {
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the interceptor-delayed SSE request to start.',
  );
};

export const waitForInterceptorDelayedSseClose = async (appUrl: string) => {
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.closeEventsObserved > 0,
    'Timed out waiting for the interceptor-delayed SSE request to close.',
  );
};

export const waitForInterceptorDelayedSseTeardown = async (appUrl: string) => {
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the interceptor-delayed SSE teardown to run.',
  );
};

export interface SignalDelayedSseStats {
  requestsStarted: number;
  resourcesAllocated: number;
  resourcesCleaned: number;
  subscriptionsStarted: number;
}

export const fetchSignalDelayedSseStats = async (
  appUrl: string,
): Promise<SignalDelayedSseStats> => {
  const response = await fetch(`${appUrl}/sse/signal/promise-delayed/stats`);
  return response.json();
};

const waitForSignalDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: SignalDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    const stats = await fetchSignalDelayedSseStats(appUrl);

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

  throw new Error(timeoutErrorMessage);
};

export const waitForSignalDelayedSseRequestStart = async (appUrl: string) => {
  await waitForSignalDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the signal-delayed SSE request to start.',
  );
};

export const waitForSignalDelayedSseResourceCleanup = async (
  appUrl: string,
) => {
  await waitForSignalDelayedSseStat(
    appUrl,
    stats => stats.resourcesCleaned > 0,
    'Timed out waiting for the signal-delayed SSE resource cleanup to run.',
  );
};

export interface SignalLifetimeSseStats {
  abortsObserved: number;
  subscriptionsStarted: number;
  teardownsObserved: number;
}

const waitForSignalLifetimeSseStat = async (
  statsUrl: string,
  predicate: (stats: SignalLifetimeSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    const response = await fetch(statsUrl);
    const stats: SignalLifetimeSseStats = await response.json();

    if (predicate(stats)) {
      return stats;
    }

    await sleep(20);
  }

  throw new Error(timeoutErrorMessage);
};

export const waitForSignalCompletingSseAbort = (appUrl: string) =>
  waitForSignalLifetimeSseStat(
    `${appUrl}/sse/signal/completing/stats`,
    stats => stats.abortsObserved > 0,
    'Timed out waiting for the completing SSE signal to abort.',
  );

export const waitForSignalStreamingSseTeardown = (appUrl: string) =>
  waitForSignalLifetimeSseStat(
    `${appUrl}/sse/signal/streaming/stats`,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the streaming SSE teardown to run.',
  );
