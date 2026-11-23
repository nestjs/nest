import { Injectable } from '../decorators/core/injectable.decorator.js';
import { Optional } from '../decorators/core/optional.decorator.js';
import { HttpStatus } from '../enums/http-status.enum.js';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface.js';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util.js';
import { isNil, isNumber, isString } from '../utils/shared.utils.js';

/**
 * @publicApi
 */
export interface ParseDatePipeOptions {
  /**
   * If true, the pipe will return null or undefined if the value is not provided
   * @default false
   */
  optional?: boolean;
  /**
   * A factory whose result is returned when the value is `null` or `undefined`,
   * regardless of `optional`
   */
  default?: () => Date;
  /**
   * The HTTP status code to be used in the response when the validation fails.
   */
  errorHttpStatusCode?: ErrorHttpStatusCode;
  /**
   * A factory function that returns an exception object to be thrown
   * if validation fails.
   * @param error Error message
   * @returns The exception object
   */
  exceptionFactory?: (error: string) => any;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];
const NAMED_MONTH_DATE_PATTERNS = [
  // "Feb 30, 2024", "Thu Feb 30 2024 10:00:00 GMT+0300", "Feb-30-2024"
  /^\s*(?:[a-z]+,?\s+)?(?<month>[a-z]{3,})\.?[\s/-]+(?<day>\d{1,2})(?:,\s*|[\s/-]+)(?<year>\d{4})(?!\d)/i,
  // "30 Feb 2024", "Thu, 30 Feb 2024 10:00:00 GMT", "30-Feb-2024"
  /^\s*(?:[a-z]+,?\s+)?(?<day>\d{1,2})[\s/-]+(?<month>[a-z]{3,})\.?(?:,\s*|[\s/-]+)(?<year>\d{4})(?!\d)/i,
  // "2024 Feb 30", "2024-Feb-30"
  /^\s*(?<year>\d{4})[\s/-]+(?<month>[a-z]{3,})\.?[\s/-]+(?<day>\d{1,2})(?!\d)/i,
];

/**
 * @publicApi
 */
@Injectable()
export class ParseDatePipe implements PipeTransform {
  protected exceptionFactory: (error: string) => any;

  constructor(
    @Optional() protected readonly options: ParseDatePipeOptions = {},
  ) {
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } =
      options;

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  transform(value: unknown): Date | null | undefined {
    if (isNil(value)) {
      // `default` applies to nil values whether or not `optional` is set.
      if (this.options.default) {
        return this.options.default();
      }
      if (this.options.optional) {
        return value;
      }
    }

    if (isNil(value) || value === '') {
      throw this.exceptionFactory('Validation failed (no Date provided)');
    }

    const transformedValue =
      isString(value) || isNumber(value) || value instanceof Date
        ? new Date(value)
        : new Date(NaN);

    if (
      isNaN(transformedValue.getTime()) ||
      (isString(value) && this.hasDayPastMonthEnd(value))
    ) {
      throw this.exceptionFactory('Validation failed (invalid date format)');
    }

    return transformedValue;
  }

  /**
   * `new Date()` rolls a day past the end of its month into the next month
   * ("2024-02-30" becomes March 1), so date strings are checked against
   * the length of their month.
   */
  protected hasDayPastMonthEnd(value: string): boolean {
    let year: number;
    let month: number;
    let day: number;

    const isoMatch =
      /^\s*([+-]\d{6}|\d{4})([-/.])(\d{1,2})\2(\d{1,2})(?!\d)/.exec(value);
    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[3]);
      day = Number(isoMatch[4]);
    } else {
      const usMatch = /^\s*(\d{1,2})([-/.])(\d{1,2})\2(\d{4})(?!\d)/.exec(
        value,
      );
      if (usMatch) {
        month = Number(usMatch[1]);
        day = Number(usMatch[3]);
        year = Number(usMatch[4]);
      } else {
        const namedMatch = this.matchNamedMonthDate(value);
        if (!namedMatch) {
          return false;
        }
        [year, month, day] = namedMatch;
      }
    }

    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const daysInMonth =
      month === 2 && isLeapYear ? 29 : DAYS_IN_MONTH[month - 1];
    return daysInMonth !== undefined && day > daysInMonth;
  }

  /**
   * Reads the year, month and day of a date whose month is a name ("Feb 30,
   * 2024", "30 Feb 2024", "2024-Feb-30"), optionally after a weekday ("Thu,
   * 30 Feb 2024 10:00:00 GMT"). As in `new Date()`, a month is named by its
   * first three letters.
   */
  private matchNamedMonthDate(
    value: string,
  ): [year: number, month: number, day: number] | undefined {
    for (const pattern of NAMED_MONTH_DATE_PATTERNS) {
      const groups = pattern.exec(value)?.groups;
      if (!groups) {
        continue;
      }
      const month =
        MONTH_NAMES.indexOf(groups.month.slice(0, 3).toLowerCase()) + 1;
      if (month > 0) {
        return [Number(groups.year), month, Number(groups.day)];
      }
    }
    return undefined;
  }
}
