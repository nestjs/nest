import { filterLogLevels } from '../../../services/utils/filter-log-levels.util.js';

describe('filterLogLevels', () => {
  it('should correctly parse an exclusive range', () => {
    const returned = filterLogLevels('>warn');
    expect(returned).toEqual(['error', 'fatal']);
  });

  it('should correctly parse an inclusive range', () => {
    const returned = filterLogLevels('>=warn');
    expect(returned).toEqual(['warn', 'error', 'fatal']);
  });

  it('should correctly parse a string list', () => {
    const returned = filterLogLevels('verbose,warn,fatal');
    expect(returned).toEqual(['verbose', 'warn', 'fatal']);
  });

  it('should correctly parse a single log level', () => {
    const returned = filterLogLevels('debug');
    expect(returned).toEqual(['debug']);
  });

  it('should return all otherwise', () => {
    const returned = filterLogLevels();
    expect(returned).toEqual([
      'verbose',
      'debug',
      'log',
      'warn',
      'error',
      'fatal',
    ]);
  });
});
