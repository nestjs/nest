import { expect } from 'chai';
import { InvalidGrpcPackageDefinitionMissingPackageDefinitionException } from '../../errors/invalid-grpc-package-definition-missing-package-definition.exception';
import { InvalidGrpcPackageDefinitionMutexException } from '../../errors/invalid-grpc-package-definition-mutex.exception';
import { getGrpcPackageDefinition } from '../../helpers/grpc-helpers';

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
      ).to.throw(InvalidGrpcPackageDefinitionMissingPackageDefinitionException);
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
      ).to.throw(InvalidGrpcPackageDefinitionMutexException);
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
      ).to.not.throw(Error);
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
      ).to.not.throw(Error);
    });
  });
});
