/*
 * Port of `append-field` (MIT, Copyright (c) 2015 Linus Unnebäck), the helper
 * multer uses to build `req.body` from text fields: `a[b]` nests, `a[0]`
 * indexes, `a[]` appends, and a repeated plain key turns into an array.
 * Ported rather than depended on, as @fastify/multipart is the only external
 * dependency this feature may add.
 * https://github.com/LinusU/node-append-field
 */
interface PathStep {
  type: 'object' | 'array';
  key: string | number;
  last?: boolean;
  append?: boolean;
  nextType?: 'object' | 'array';
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function parsePath(key: string): PathStep[] {
  const failure = (): PathStep[] => [{ type: 'object', key, last: true }];
  const firstKey = /^[^[]*/.exec(key)![0];
  if (!firstKey) {
    return failure();
  }

  let pos = firstKey.length;
  let tail: PathStep = { type: 'object', key: firstKey };
  const steps = [tail];

  while (pos < key.length) {
    if (key[pos] === '[' && key[pos + 1] === ']') {
      pos += 2;
      tail.append = true;
      if (pos !== key.length) {
        return failure();
      }
      continue;
    }
    const rest = key.substring(pos);
    let match = /^\[(\d+)\]/.exec(rest);
    if (match) {
      pos += match[0].length;
      tail.nextType = 'array';
      tail = { type: 'array', key: parseInt(match[1], 10) };
      steps.push(tail);
      continue;
    }
    match = /^\[([^\]]+)\]/.exec(rest);
    if (match) {
      pos += match[0].length;
      tail.nextType = 'object';
      tail = { type: 'object', key: match[1] };
      steps.push(tail);
      continue;
    }
    return failure();
  }
  tail.last = true;
  return steps;
}

function valueType(value: unknown) {
  if (value === undefined) {
    return 'undefined';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'object') {
    return 'object';
  }
  return 'scalar';
}

function setLastValue(
  ctx: any,
  step: PathStep,
  current: any,
  value: unknown,
): any {
  switch (valueType(current)) {
    case 'undefined':
      ctx[step.key] = step.append ? [value] : value;
      break;
    case 'array':
      ctx[step.key].push(value);
      break;
    case 'object':
      return setLastValue(
        current,
        { type: 'object', key: '', last: true },
        current[''],
        value,
      );
    case 'scalar':
      ctx[step.key] = [ctx[step.key], value];
      break;
  }
  return ctx;
}

function setValue(ctx: any, step: PathStep, current: any, value: unknown): any {
  if (step.last) {
    return setLastValue(ctx, step, current, value);
  }
  let obj: any;
  switch (valueType(current)) {
    case 'undefined':
      ctx[step.key] = step.nextType === 'array' ? [] : Object.create(null);
      return ctx[step.key];
    case 'object':
      return current;
    case 'array':
      if (step.nextType === 'array') {
        return current;
      }
      obj = Object.create(null);
      ctx[step.key] = obj;
      current.forEach((item: unknown, i: number) => {
        if (item !== undefined) {
          obj['' + i] = item;
        }
      });
      return obj;
    case 'scalar':
      obj = Object.create(null);
      obj[''] = current;
      ctx[step.key] = obj;
      return obj;
  }
}

/**
 * Appends a text field to `store` using multer's bracket notation.
 * Returns `false` (leaving `store` untouched) for names that would pollute a
 * prototype.
 */
export function appendField(
  store: object,
  key: string,
  value: unknown,
): boolean {
  const steps = parsePath(key);
  if (steps.some(step => FORBIDDEN_KEYS.has(String(step.key)))) {
    return false;
  }
  steps.reduce(
    (ctx, step) => setValue(ctx, step, ctx[step.key], value),
    store as any,
  );
  return true;
}
