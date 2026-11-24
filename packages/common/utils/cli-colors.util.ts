type ColorTextFn = (text: string) => string;

let singleColorCheckDepth = 0;
let singleColorCheckResult: boolean | undefined;

export const isColorAllowed = () => {
  if (singleColorCheckDepth === 0) {
    return !process.env.NO_COLOR;
  }
  return (singleColorCheckResult ??= !process.env.NO_COLOR);
};

/**
 * Runs the synchronous callback with `NO_COLOR` read at most once, on the
 * first color check, for code that colors several parts of the same output
 * (e.g. a log line). Reading `process.env` is a call into the runtime, much
 * slower than the coloring itself.
 */
export function withSingleColorCheck<T>(callback: () => T): T {
  singleColorCheckDepth++;
  try {
    return callback();
  } finally {
    if (--singleColorCheckDepth === 0) {
      singleColorCheckResult = undefined;
    }
  }
}

const colorIfAllowed = (colorFn: ColorTextFn) => (text: string) =>
  isColorAllowed() ? colorFn(text) : text;

export const clc = {
  bold: colorIfAllowed((text: string) => `\x1B[1m${text}\x1B[0m`),
  green: colorIfAllowed((text: string) => `\x1B[32m${text}\x1B[39m`),
  yellow: colorIfAllowed((text: string) => `\x1B[33m${text}\x1B[39m`),
  red: colorIfAllowed((text: string) => `\x1B[31m${text}\x1B[39m`),
  magentaBright: colorIfAllowed((text: string) => `\x1B[95m${text}\x1B[39m`),
  cyanBright: colorIfAllowed((text: string) => `\x1B[96m${text}\x1B[39m`),
};
export const yellow = colorIfAllowed(
  (text: string) => `\x1B[38;5;3m${text}\x1B[39m`,
);
