import { GrpcOptions } from '../interfaces';
import { InvalidGrpcPackageDefinitionMutexException } from '../errors/invalid-grpc-package-definition-mutex.exception';
import { InvalidGrpcPackageDefinitionMissingPacakgeDefinitionException } from '../errors/invalid-grpc-package-definition-missing-package-definition.exception';

export function getGrpcPackageDefinition(
  options: GrpcOptions['options'],
  grpcProtoLoaderPackage: any,
) {
  const file = options['protoPath'];
  const packageDefinition = options['packageDefinition'];

  if ([file, packageDefinition].every(x => x != undefined)) {
    throw new InvalidGrpcPackageDefinitionMutexException();
  }

  if ([file, packageDefinition].every(x => x == undefined)) {
    throw new InvalidGrpcPackageDefinitionMissingPacakgeDefinitionException();
  }

  return (
    packageDefinition ||
    grpcProtoLoaderPackage.loadSync(file, options['loader'])
  );
}
