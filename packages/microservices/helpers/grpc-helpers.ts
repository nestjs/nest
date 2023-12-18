import { InvalidGrpcPackageDefinitionMissingPackageDefinitionException } from '../errors/invalid-grpc-package-definition-missing-package-definition.exception';
import { InvalidGrpcPackageDefinitionMutexException } from '../errors/invalid-grpc-package-definition-mutex.exception';
import { GrpcOptions } from '../interfaces';

export function getGrpcPackageDefinition(
  options: GrpcOptions['options'],
  grpcProtoLoaderPackage: any,
) {
  const file = options['protoPath'];
  const packageDefinition = options['packageDefinition'];

  if (file && packageDefinition) {
    throw new InvalidGrpcPackageDefinitionMutexException();
  }
  if (!file && !packageDefinition) {
    throw new InvalidGrpcPackageDefinitionMissingPackageDefinitionException();
  }

  return (
    packageDefinition ||
    grpcProtoLoaderPackage.loadSync(file, options['loader'])
  );
}
