import { codechecks, CodeChecksReport } from '@codechecks/client';
import * as bytes from 'bytes';
import { Benchmarks, getBenchmarks, LIBS } from './get-benchmarks';

const markdownTable = require('markdown-table');
const benchmarksKey = 'nest/performance-benchmark';

export default async function checkBenchmarks() {
  const currentBenchmarks = await getBenchmarks();
  await codechecks.saveValue(benchmarksKey, currentBenchmarks);

  if (!codechecks.isPr()) {
    return;
  }
  const baselineBenchmarks = await codechecks.getValue<Benchmarks>(
    benchmarksKey,
  );
  const report = getCodechecksReport(currentBenchmarks, baselineBenchmarks);
  await codechecks.report(report);
}

function getCodechecksReport(
  current: Benchmarks,
  baseline: Benchmarks | undefined,
): CodeChecksReport {
  const diff = getDiff(current, baseline);

  const shortDescription = getShortDescription(baseline, diff);
  const longDescription = getLongDescription(current, baseline, diff);

  return {
    name: 'Benchmarks',
    status: 'success',
    shortDescription,
    longDescription,
  };
}

function getShortDescription(
  baseline: Benchmarks | undefined,
  diff: BenchmarksDiff,
): string {
  if (!baseline) {
    return 'New benchmarks generated';
  }

  const avgDiff = getAverageDiff(diff);
  if (avgDiff > 0) {
    return `Performance improved by ${avgDiff.toFixed(
      2,
    )}% on average, good job!`;
  }
  if (avgDiff === 0) {
    return `No changes in performance detected`;
  }
  if (avgDiff < 0) {
    return `Performance decreased by ${avgDiff.toFixed(
      2,
    )}% on average, be careful!`;
  }
}

function getLongDescription(
  current: Benchmarks,
  baseline: Benchmarks | undefined,
  diff: BenchmarksDiff,
): string {
  function printTableRow(id: string, label: string): string[] {
    return [
      label,
      current[id].requestsPerSec.toFixed(0),
      current[id].transferPerSec,
      baseline ? formatPerc(diff[id].requestsPerSecDiff) : '-',
      baseline ? formatPerc(diff[id].transferPerSecDiff) : '-',
    ];
  }

  const table = [
    ['', 'Req/sec', 'Trans/sec', 'Req/sec DIFF', 'Trans/sec DIFF'],
    printTableRow('nest', 'Nest-Express'),
    printTableRow('nest-fastify', 'Nest-Fastify'),
    printTableRow('express', 'Express'),
    printTableRow('fastify', 'Fastify'),
  ];

  return markdownTable(table);
}

function getDiff(
  current: Benchmarks,
  baseline: Benchmarks | undefined,
): BenchmarksDiff {
  const diff: BenchmarksDiff = {};
  for (const l of LIBS) {
    if (!baseline) {
      diff[l] = undefined;
      continue;
    }

    const currentValue = current[l];
    const baselineValue = baseline[l];

    diff[l] = {
      requestsPerSecDiff: getRequestDiff(
        currentValue.requestsPerSec,
        baselineValue.requestsPerSec,
      ),
      transferPerSecDiff: getTransferDiff(
        currentValue.transferPerSec,
        baselineValue.transferPerSec,
      ),
    };
  }
  return diff;
}

function getTransferDiff(
  currentTransfer: string,
  baselineTransfer: string,
): number {
  return 1 - bytes.parse(currentTransfer) / bytes.parse(baselineTransfer);
}

function getAverageDiff(diff: BenchmarksDiff) {
  return (
    (diff['nest'].transferPerSecDiff +
      diff['nest'].requestsPerSecDiff +
      diff['nest-fastify'].transferPerSecDiff +
      diff['nest-fastify'].requestsPerSecDiff) /
    4
  );
}

function getRequestDiff(currentRequest: number, baselineRequest: number) {
  return 1 - currentRequest / baselineRequest;
}

interface BenchmarkDiff {
  transferPerSecDiff: number | undefined;
  requestsPerSecDiff: number | undefined;
}

interface BenchmarksDiff {
  [lib: string]: BenchmarkDiff;
}

function formatPerc(n: number) {
  return (n > 0 ? '+' : '') + (n * 100).toFixed(2) + '%';
}
