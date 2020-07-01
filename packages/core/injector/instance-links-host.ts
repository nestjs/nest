import { Abstract, Type } from '@nestjs/common';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';
import { NestContainer } from './container';
import { InstanceWrapper } from './instance-wrapper';
import { Module } from './module';

type InstanceToken = string | symbol | Type<any> | Abstract<any> | Function;
type HostCollection = 'providers' | 'controllers' | 'injectables';

export interface InstanceLink<T = any> {
  token: InstanceToken;
  wrapperRef: InstanceWrapper<T>;
  collection: Map<any, InstanceWrapper>;
  moduleId: string;
}

export class InstanceLinksHost {
  private readonly instanceLinks = new Map<InstanceToken, InstanceLink[]>();

  constructor(private readonly container: NestContainer) {
    this.initialize();
  }

  get<T = any>(token: InstanceToken, moduleId?: string): InstanceLink<T> {
    const name = isFunction(token)
      ? (token as Function).name
      : (token as string | symbol);
    const modulesMap = this.instanceLinks.get(name);

    if (!modulesMap) {
      throw new UnknownElementException(name);
    }
    const instanceLink = moduleId
      ? modulesMap.find(item => item.moduleId === moduleId)
      : modulesMap[0];

    if (!instanceLink) {
      throw new UnknownElementException(name);
    }
    return instanceLink;
  }

  private initialize() {
    const modules = this.container.getModules();
    modules.forEach(moduleRef => {
      const { providers, injectables, controllers } = moduleRef;
      providers.forEach((wrapper, token) =>
        this.addLink(wrapper, token, moduleRef, 'providers'),
      );
      injectables.forEach((wrapper, token) =>
        this.addLink(wrapper, token, moduleRef, 'injectables'),
      );
      controllers.forEach((wrapper, token) =>
        this.addLink(wrapper, token, moduleRef, 'controllers'),
      );
    });
  }

  private addLink(
    wrapper: InstanceWrapper,
    token: InstanceToken,
    moduleRef: Module,
    collectionName: HostCollection,
  ) {
    const instanceLink: InstanceLink = {
      moduleId: moduleRef.id,
      wrapperRef: wrapper,
      collection: moduleRef[collectionName],
      token,
    };
    const existingLinks = this.instanceLinks.get(token);
    if (!existingLinks) {
      this.instanceLinks.set(token, [instanceLink]);
    } else {
      existingLinks.push(instanceLink);
    }
  }
}
