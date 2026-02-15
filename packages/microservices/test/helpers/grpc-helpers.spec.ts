import { InvalidGrpcPackageDefinitionMissingPackageDefinitionException } from '../../errors/invalid-grpc-package-definition-missing-package-definition.exception.js';
import { InvalidGrpcPackageDefinitionMutexException } from '../../errors/invalid-grpc-package-definition-mutex.exception.js';
import { getGrpcPackageDefinition } from '../../helpers/grpc-helpers.js';

const grpcProtoLoaderPackage = { loadSync: (a, b) => 'withLoader' };

describe('getGrpcPackageDefinition', () => {
  describe('when missing both protoPath and packageDefinition', () => {
    it('should throw InvalidGrpcPackageDefinitionMissingPackageDefinitionException', () => {
      expect(() =>
        getGrpcPackageDefinition(
          {
            package: 'somePackage',
          },
          grpcProtoLoaderPackage,
        ),
      ).toThrow(InvalidGrpcPackageDefinitionMissingPackageDefinitionException);
    });
  });

  describe('when both protoPath and packageDefinition are defined', () => {
    it('should throw InvalidGrpcPackageDefinitionMutexException', () => {
      expect(() =>
        getGrpcPackageDefinition(
          {
            package: 'somePackage',
            protoPath: 'some/path',
            packageDefinition: {},
          },
          grpcProtoLoaderPackage,
        ),
      ).toThrow(InvalidGrpcPackageDefinitionMutexException);
    });
  });

  describe('when only protoPath is defined', () => {
    it('should not throw any exception', () => {
      expect(() =>
        getGrpcPackageDefinition(
          {
            package: 'somePackage',
            protoPath: 'some/path',
          },
          grpcProtoLoaderPackage,
        ),
      ).not.toThrow(Error);
    });
  });

  describe('when only packageDefinition is defined', () => {
    it('should not throw any exception', () => {
      expect(() =>
        getGrpcPackageDefinition(
          {
            package: 'somePackage',
            packageDefinition: {},
          },
          grpcProtoLoaderPackage,
        ),
      ).not.toThrow(Error);
    });
  });
});
