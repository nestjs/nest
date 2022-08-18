import { expect } from 'chai';
import { selectExceptionFilterMetadata } from '../../utils/select-exception-filter-metadata.util';

class FirstError {}

class SecondError {}

class ThirdError {}

class FourthError {}

describe('selectExceptionFilterMetadata', () => {
  it('should pass error handling to first suitable error handler', () => {
    const metadataList = [
      {
        exceptionMetatypes: [FirstError, SecondError],
        func: () => {},
      },
      {
        exceptionMetatypes: [ThirdError, FourthError],
        func: () => {},
      },
    ];

    expect(
      selectExceptionFilterMetadata(metadataList, new FourthError()),
    ).to.be.equal(metadataList[1]);
  });

  describe('when multiple exception handlers are accepting error handling', () => {
    it('should pass exception handling to the first one', () => {
      const metadataList = [
        {
          exceptionMetatypes: [FirstError, SecondError],
          func: () => {},
        },
        {
          exceptionMetatypes: [FirstError, FourthError],
          func: () => {},
        },
      ];

      expect(
        selectExceptionFilterMetadata(metadataList, new FirstError()),
      ).to.be.equal(metadataList[0]);
    });
  });

  describe('when no exception handler is accepting error handling', () => {
    it('should return undefined', () => {
      const metadataList = [
        {
          exceptionMetatypes: [FirstError, SecondError],
          func: () => {},
        },
        {
          exceptionMetatypes: [FirstError, FourthError],
          func: () => {},
        },
      ];

      expect(selectExceptionFilterMetadata(metadataList, new ThirdError())).to
        .be.undefined;
    });
  });

  describe('when exception handler has empty list of meta types', () => {
    it('should pass any remaining error handling to it', () => {
      const metadataList = [
        {
          exceptionMetatypes: [FirstError, SecondError],
          func: () => {},
        },
        {
          exceptionMetatypes: [],
          func: () => {},
        },
      ];

      expect(
        selectExceptionFilterMetadata(metadataList, new ThirdError()),
      ).to.be.equal(metadataList[1]);
    });
  });
});
