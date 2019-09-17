Short description (shown on main PR screen): Performance improved 0.13% on average.

Long description (after clicking details):

|                | Req/sec | Trans/sec | Req/sec DIFF | Trans/sec DIFF | Req vs Express | Trans vs Fastify |
| -------------- | ------- | --------- | ------------ | -------------- | -------------- | ---------------- |
| NestJS-Express | 3.37MB  | 16375.58  | +0.15%       | +0.14%         | 80.62%         | 80.37%           |
| NestJS-Fastify | 4.78MB  | 32728.51  | +0.12%       | +0.12          | 64.76%         | 64.25%           |
| Express        | 4.18MB  | 20374.59  | 0%           | 0%             | -              | -                |
| Fastify        | 7.38MB  | 50938     | 0%           | 0%             | -              | -                |

## Explanations:

Short description: average of all diffs for NestJS-\* so: `(0.15 + 0.14 + 0.12 + 0.12) / 4`

Long description:

`req/sec DIFF` and `Trans/sec DIFF` is in comparison to the baseline on target branch (master).

Req vs express is calculated as perf compared to NOT using nestjs so: 80.62% = (3.37/4.18) \* 100%
