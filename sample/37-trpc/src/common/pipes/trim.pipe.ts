import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';

/**
 * Trims all string values in the input object.
 * Demonstrates NestJS pipe integration with tRPC.
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (value && typeof value === 'object') {
      const trimmed: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        trimmed[key] = typeof val === 'string' ? val.trim() : val;
      }
      return trimmed;
    }
    return value;
  }
}
