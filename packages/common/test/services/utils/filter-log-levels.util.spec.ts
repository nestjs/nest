import { expect } from 'chai';
import { filterLogLevels } from '../../../services/utils/filter-log-levels.util';

describe('filterLogLevels', () => {
  it('should correctly parse an exclusive range', () => {
    const returned = filterLogLevels('>warn');
    expect(returned).to.deep.equal(['error', 'fatal']);
  });

  it('should correctly parse an inclusive range', () => {
    const returned = filterLogLevels('>=warn');
    expect(returned).to.deep.equal(['warn', 'error', 'fatal']);
  });

  it('should correctly parse a string list', () => {
    const returned = filterLogLevels('verbose,warn,fatal');
    expect(returned).to.deep.equal(['verbose', 'warn', 'fatal']);
  });

  it('should correctly parse a single log level', () => {
    const returned = filterLogLevels('debug');
    expect(returned).to.deep.equal(['debug']);
  });

  it('should return all otherwise', () => {
    const returned = filterLogLevels();
    expect(returned).to.deep.equal([
      'verbose',
      'debug',
      'log',
      'warn',
      'error',
      'fatal',
    ]);
  });
});
