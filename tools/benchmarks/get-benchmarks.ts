import wrkPkg = require('wrk');
import { spawn } from 'child_process';
import { join } from 'path';

export interface Benchmarks {
  [lib: string]: WrkResults;
}

const wrk = (options: any) =>
  new Promise<WrkResults>((resolve, reject) =>
    wrkPkg(options, (err: any, result: any) =>
      err ? reject(err) : resolve(result),
    ),
  );

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

const BENCHMARK_PATH = join(__dirname, '../../benchmarks');
export const LIBS = ['express', 'fastify', 'nest', 'nest-fastify'];

async function runBenchmarkOfLib(lib: string): Promise<WrkResults> {
  const libPath = join(BENCHMARK_PATH, `${lib}.js`);
  const process = spawn('node', [libPath], {
    detached: true,
    stdio: 'ignore',
  });

  process.unref();

  await sleep(2000);

  const result = await wrk({
    threads: 8,
    duraton: '10s',
    connections: 1024,
    url: 'http://localhost:3000',
  });

  process.kill();
  return result;
}

export async function getBenchmarks() {
  const results: Benchmarks = {};
  for await (const lib of LIBS) {
    const result = await runBenchmarkOfLib(lib);
    results[lib] = result;
  }
  return results;
}

interface WrkResults {
  transferPerSec: string;
  requestsPerSec: number;
  connectErrors: string;
  readErrors: string;
  writeErrors: string;
  timeoutErrors: string;
  requestsTotal: number;
  durationActual: string;
  transferTotal: string;
  latencyAvg: string;
  latencyStdev: string;
  latencyMax: string;
  latencyStdevPerc: number;
  rpsAvg: string;
  rpsStdev: string;
  rpsMax: string;
  rpsStdevPerc: number;
}
