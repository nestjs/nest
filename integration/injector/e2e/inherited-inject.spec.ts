import { Inject, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

const TOKEN = 'INHERITED_TOKEN';

@Injectable()
class OwnDependency {
  exec() {
    return 'exec';
  }
}

@Injectable()
class ParentService {
  constructor(@Inject(TOKEN) readonly token: unknown) {}
}

@Injectable()
class RedeclaringChild extends ParentService {
  constructor(readonly own: OwnDependency) {
    super(undefined);
  }
}

@Injectable()
class InheritingChild extends ParentService {}

@Module({
  providers: [
    OwnDependency,
    ParentService,
    RedeclaringChild,
    InheritingChild,
    { provide: TOKEN, useValue: 'token-value' },
  ],
})
class TestModule {}

describe('Inherited @Inject() dependency', () => {
  /**
   * You can see details on this issue here: https://github.com/nestjs/nest/issues/2581
   */
  describe('when the parent has an @Inject() parameter', () => {
    it('should use the parameter types of the child that redeclares the constructor', async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      expect(module.get(RedeclaringChild).own).toBeInstanceOf(OwnDependency);
    });

    it('should not resolve the parent token for the child that redeclares the constructor', async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      expect(module.get(RedeclaringChild).own).not.toBe('token-value');
    });

    it('should inherit the @Inject() token when the child does not redeclare the constructor', async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      expect(module.get(InheritingChild).token).toBe('token-value');
    });
  });
});
