import { expect } from 'chai';
import { getGrpcPackageDefinition } from '../../helpers/grpc-helpers';
import { InvalidGrpcPackageDefinitionMutexException } from '../../errors/invalid-grpc-package-definition-mutex.exception';
import { InvalidGrpcPackageDefinitionMissingPacakgeDefinitionException } from '../../errors/invalid-grpc-package-definition-missing-package-definition.exception';

const grpcProtoLoaderPackage = { loadSync: (a, b) => 'withLoader' };

describe('getGrpcPackageDefinition', () => {
  it('missing both protoPath and packageDefinition', () => {
    expect(() =>
      getGrpcPackageDefinition(
        {
          package: 'somePackage',
        },
        grpcProtoLoaderPackage,
      ),
    ).to.throw(InvalidGrpcPackageDefinitionMissingPacakgeDefinitionException);
  });

  it('got both protoPath and packageDefinition', () => {
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

  it('success with protoPath', () => {
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

  it('success with packageDef', () => {
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
