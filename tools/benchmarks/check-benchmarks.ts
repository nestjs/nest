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
      baseline ? diff[id].requestsPerSecDuff.toFixed(2) : '-',
      baseline ? diff[id].transferPerSecDiff.toFixed(2) : '-',
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
  const diff = {};
  for (const l of LIBS) {
    if (!baseline) {
      diff[l] = undefined;
      continue;
    }

    const currentValue = current[l];
    const baselineValue = baseline[l];

    diff[l] = {
      requestsPerSec: getRequestDiff(
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
      diff['nest'].requestsPerSecDuff +
      diff['nest-fastify'].transferPerSecDiff +
      diff['nest-fastify'].requestsPerSecDuff) /
    4
  );
}

function getRequestDiff(currentRequest: number, baselineRequest: number) {
  return 1 - currentRequest / baselineRequest;
}

interface BenchmarkDiff {
  transferPerSecDiff: number | undefined;
  requestsPerSecDuff: number | undefined;
}

interface BenchmarksDiff {
  [lib: string]: BenchmarkDiff;
}
