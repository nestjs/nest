import wrkPkg = require('wrk');
import { spawn } from 'child_process';
import { join } from 'path';

const wrk = (options: any) =>
  new Promise((resolve, reject) =>
    wrkPkg(options, (err: any, result: any) =>
      err ? reject(err) : resolve(result),
    ),
  );

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

const BENCHMARK_PATH = join(__dirname, '../../benchmarks');
const LIBS = ['express', 'fastify', 'nest', 'nest-fastify'];

async function runBenchmarkOfLib(lib: string) {
  const libPath = join(BENCHMARK_PATH, `${lib}.js`);
  const process = spawn('node', [libPath], {
    detached: true,
    stdio: 'ignore'
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
  const results = {};
  for await (const lib of LIBS) {
    const result = await runBenchmarkOfLib(lib);
    results[lib] = result;
  }
  return results;
}
