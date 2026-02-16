import { fork, ChildProcess } from 'node:child_process';
import { dirname, join } from 'node:path';
import { run } from './autocannon/run.js';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Framework =
  | 'express'
  | 'fastify'
  | 'h3'
  | 'nest-express'
  | 'nest-fastify'
  | 'nest-h3';

type Args = {
  connections: number;
  duration: number;
  pipelining: number;
  verbose: boolean;
  port: number;
  path: string;
};

type BenchmarkSummary = {
  requestsPerSecAvg: number;
  latencyAvgMs: number;
  latencyP99Ms: number;
  throughputBytesPerSecAvg: number;
};

const DEFAULTS: Args = {
  connections: 100,
  duration: 10,
  pipelining: 10,
  verbose: false,
  port: 3000,
  path: '/',
};

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--verbose' || token === '-v') {
      args.verbose = true;
      continue;
    }

    if (token === '--connections' || token === '-c') {
      args.connections = parseNumber(argv[++i], args.connections);
      continue;
    }

    if (token === '--duration' || token === '-d') {
      args.duration = parseNumber(argv[++i], args.duration);
      continue;
    }

    if (token === '--pipelining' || token === '-p') {
      args.pipelining = parseNumber(argv[++i], args.pipelining);
      continue;
    }

    if (token === '--port') {
      args.port = parseNumber(argv[++i], args.port);
      continue;
    }

    if (token === '--path') {
      args.path = argv[++i] ?? args.path;
      continue;
    }

    if (token === '--help' || token === '-h') {
      printHelpAndExit(0);
    }
  }

  return args;
}

function printHelpAndExit(code: number): never {
  // Keep this simple so `npm run benchmarks` works without extra args.
  // Tuning: `--connections`, `--duration`, `--pipelining`, `--port`, `--path`
  // Notes: The benchmark spawns the framework server as a child process and
  // runs autocannon against it.
  //

  console.log(
    `
Usage:
  npm run benchmarks [-- --verbose]
  npm run benchmarks [-- --connections 100] [-- --duration 10] [-- --pipelining 10]
  npm run benchmarks [-- --port 3000] [-- --path /]

Defaults:
  verbose:   ${DEFAULTS.verbose}
  connections: ${DEFAULTS.connections}
  duration:    ${DEFAULTS.duration}
  pipelining:  ${DEFAULTS.pipelining}
  port:        ${DEFAULTS.port}
  path:        ${DEFAULTS.path}
`.trim(),
  );
  process.exit(code);
}

function frameworkEntry(framework: Framework): string {
  return join(__dirname, '.', 'frameworks', framework);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  // Use global fetch if available (Node 18+). If not, just wait a bit.
  const hasFetch = typeof (globalThis as any).fetch === 'function';

  while (Date.now() - start < timeoutMs) {
    try {
      if (hasFetch) {
        const res = await (globalThis as any).fetch(url, { method: 'GET' });
        if (res && (res.status === 200 || res.status === 404)) return;
      } else {
        // best-effort fallback
        await sleep(250);
        return;
      }
    } catch {
      // server not ready yet
    }
    await sleep(100);
  }

  throw new Error(`Server did not become ready in ${timeoutMs}ms: ${url}`);
}

function killChild(child: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    if (!child || child.killed) {
      resolve();
      return;
    }

    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(forceKillTimer);
      clearTimeout(safetyTimer);
      resolve();
    };

    // Resolve once the process actually exits.
    child.on('exit', done);

    // Try graceful termination first.
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }

    // Force kill if still alive after 2s.
    const forceKillTimer = setTimeout(() => {
      try {
        if (!child.killed) child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }, 2_000);
    forceKillTimer.unref?.();

    // Safety net: don't hang forever if 'exit' never fires.
    const safetyTimer = setTimeout(done, 5_000);
    safetyTimer.unref?.();
  });
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function summarizeResult(result: any): BenchmarkSummary {
  return {
    requestsPerSecAvg: toNumber(result?.requests?.average),
    latencyAvgMs: toNumber(result?.latency?.average),
    latencyP99Ms: toNumber(result?.latency?.p99),
    throughputBytesPerSecAvg: toNumber(result?.throughput?.average),
  };
}

function pctChange(newValue: number, oldValue: number): number | null {
  if (
    !Number.isFinite(newValue) ||
    !Number.isFinite(oldValue) ||
    oldValue === 0
  )
    return null;
  return ((newValue - oldValue) / oldValue) * 100;
}

function fmtPct(p: number | null, digits = 1): string {
  if (p == null) return 'n/a';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(digits)}%`;
}

function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return 'n/a';
  return n.toFixed(digits);
}

function fmtBytesPerSec(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  const abs = Math.abs(n);
  if (abs >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB/s`;
  if (abs >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB/s`;
  if (abs >= 1024) return `${(n / 1024).toFixed(2)} KB/s`;
  return `${n.toFixed(0)} B/s`;
}

function printComparison(
  baseName: string,
  base: BenchmarkSummary | undefined,
  nestName: string,
  nest: BenchmarkSummary | undefined,
): void {
  console.log(`\n--- Comparison: ${baseName} <-> ${nestName} ---`);

  if (!base || !nest) {
    console.log(
      `Missing results: ${baseName}=${base ? 'ok' : 'missing'} ${nestName}=${nest ? 'ok' : 'missing'}`,
    );
    return;
  }

  const rpsPct = pctChange(nest.requestsPerSecAvg, base.requestsPerSecAvg);
  const latAvgPct = pctChange(nest.latencyAvgMs, base.latencyAvgMs);
  const latP99Pct = pctChange(nest.latencyP99Ms, base.latencyP99Ms);
  const thrPct = pctChange(
    nest.throughputBytesPerSecAvg,
    base.throughputBytesPerSecAvg,
  );

  console.log(
    `Requests/sec avg: ${fmtNum(base.requestsPerSecAvg)} -> ${fmtNum(nest.requestsPerSecAvg)} (${fmtPct(rpsPct)})`,
  );

  console.log(
    `Latency avg (ms): ${fmtNum(base.latencyAvgMs)} -> ${fmtNum(nest.latencyAvgMs)} (${fmtPct(latAvgPct)})`,
  );

  console.log(
    `Latency p99 (ms): ${fmtNum(base.latencyP99Ms)} -> ${fmtNum(nest.latencyP99Ms)} (${fmtPct(latP99Pct)})`,
  );

  console.log(
    `Throughput avg:  ${fmtBytesPerSec(base.throughputBytesPerSecAvg)} -> ${fmtBytesPerSec(nest.throughputBytesPerSecAvg)} (${fmtPct(thrPct)})`,
  );
}

async function runOne(
  framework: Framework,
  args: Args,
): Promise<BenchmarkSummary> {
  const child = fork(frameworkEntry(framework), {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });

  // Surface child process errors (e.g. EADDRINUSE) so they aren't swallowed.
  child.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[${framework}] ${chunk}`);
  });

  const url = `http://localhost:${args.port}${args.path.startsWith('/') ? args.path : `/${args.path}`}`;

  try {
    await waitForServer(url);

    console.log(`\n=== ${framework.toUpperCase()} ===`);

    console.log(`Target: ${url}`);

    console.log(
      `connections=${args.connections} duration=${args.duration} pipelining=${args.pipelining}`,
    );

    console.log(`Warmup: ${framework.toUpperCase()}`);
    await run({
      url,
      connections: args.connections,
      duration: args.duration,
      pipelining: args.pipelining,
      verbose: args.verbose,
    });

    console.log(`Warmup ended: ${framework.toUpperCase()}`);

    const result = (await run({
      url,
      connections: args.connections,
      duration: args.duration,
      pipelining: args.pipelining,
      verbose: args.verbose,
    })) as any;

    const summary = summarizeResult(result);

    // Keep output readable and stable across autocannon versions.

    console.log(`Requests/sec: ${summary.requestsPerSecAvg}`);

    console.log(
      `Latency (ms): avg=${summary.latencyAvgMs} p99=${summary.latencyP99Ms}`,
    );

    console.log(`Throughput (B/s): avg=${summary.throughputBytesPerSecAvg}`);

    return summary;
  } finally {
    await killChild(child);
    // Give the OS time to release the port.
    await sleep(500);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const targets: Framework[] = [
    'express',
    'nest-express',
    'fastify',
    'nest-fastify',
    'h3',
    'nest-h3',
  ];

  const results: Partial<Record<Framework, BenchmarkSummary>> = {};

  // Run sequentially to avoid port conflicts (both frameworks listen on the same port).
  for (const fw of targets) {
    results[fw] = await runOne(fw, args);
    // small cooldown between runs
    await sleep(250);
  }

  // Compare raw framework vs Nest adapter for same underlying HTTP server
  printComparison(
    'EXPRESS',
    results['express'],
    'NEST-EXPRESS',
    results['nest-express'],
  );
  printComparison(
    'FASTIFY',
    results['fastify'],
    'NEST-FASTIFY',
    results['nest-fastify'],
  );
  printComparison('H3', results['h3'], 'NEST-H3', results['nest-h3']);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
