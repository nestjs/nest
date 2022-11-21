import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { EnhancerMetadataCacheEntry } from './interfaces/enhancer-metadata-cache-entry.interface';
import { Entrypoint } from './interfaces/entrypoint.interface';
import { OrphanedEnhancerDefinition } from './interfaces/extras.interface';
import { ClassNode, Node } from './interfaces/node.interface';
import { SerializedGraph } from './serialized-graph';

export class GraphInspector {
  private readonly graph: SerializedGraph;
  private readonly enhancersMetadataCache =
    new Array<EnhancerMetadataCacheEntry>();

  constructor(private readonly container: NestContainer) {
    this.graph = container.serializedGraph;
  }

  public inspectModules() {
    const modules = this.container.getModules().values();

    for (const moduleRef of modules) {
      this.insertModuleNode(moduleRef);
      this.insertClassNodes(moduleRef);
      this.insertModuleToModuleEdges(moduleRef);
    }

    this.enhancersMetadataCache.forEach(entry =>
      this.insertEnhancerEdge(entry),
    );
  }

  public inspectInstanceWrapper<T = any>(
    source: InstanceWrapper<T>,
    moduleRef: Module,
  ) {
    const ctorMetadata = source.getCtorMetadata();
    ctorMetadata?.forEach((target, index) =>
      this.insertClassToClassEdge(
        source,
        target,
        moduleRef,
        index,
        'constructor',
      ),
    );

    const propertiesMetadata = source.getPropertiesMetadata();
    propertiesMetadata?.forEach(({ key, wrapper: target }) =>
      this.insertClassToClassEdge(source, target, moduleRef, key, 'property'),
    );
  }

  public insertEnhancerMetadataCache(entry: EnhancerMetadataCacheEntry) {
    this.enhancersMetadataCache.push(entry);
  }

  public insertOrphanedEnhancer(entry: OrphanedEnhancerDefinition) {
    this.graph.insertOrphanedEnhancer(entry);
  }

  public insertAttachedEnhancer(wrapper: InstanceWrapper) {
    const existingNode = this.graph.getNodeById(wrapper.id);
    existingNode.metadata.global = true;

    this.graph.insertAttachedEnhancer(existingNode.id);
  }

  public insertEntrypointDefinition<T>(definition: Entrypoint<T>) {
    this.graph.insertEntrypoint(definition);
  }

  private insertModuleNode(moduleRef: Module) {
    const dynamicMetadata = this.container.getDynamicMetadataByToken(
      moduleRef.token,
    );
    const node: Node = {
      id: moduleRef.id,
      label: moduleRef.name,
      metadata: {
        type: 'module',
        global: moduleRef.isGlobal,
        dynamic: !!dynamicMetadata,
      },
    };
    this.graph.insertNode(node);
  }

  private insertModuleToModuleEdges(moduleRef: Module) {
    for (const targetModuleRef of moduleRef.imports) {
      this.graph.insertEdge({
        source: moduleRef.id,
        target: targetModuleRef.id,
        metadata: {
          type: 'module-to-module',
          sourceModuleName: moduleRef.name,
          targetModuleName: targetModuleRef.name,
        },
      });
    }
  }

  private insertEnhancerEdge(entry: EnhancerMetadataCacheEntry) {
    const moduleRef = this.container.getModuleByKey(entry.moduleToken);
    const sourceInstanceWrapper =
      moduleRef.controllers.get(entry.classRef) ??
      moduleRef.providers.get(entry.classRef);
    const existingSourceNode = this.graph.getNodeById(
      sourceInstanceWrapper.id,
    ) as ClassNode;
    const enhancers = existingSourceNode.metadata.enhancers ?? [];

    if (entry.enhancerInstanceWrapper) {
      this.insertClassToClassEdge(
        sourceInstanceWrapper,
        entry.enhancerInstanceWrapper,
        moduleRef,
        undefined,
        'decorator',
      );

      enhancers.push({
        id: entry.enhancerInstanceWrapper.id,
        methodKey: entry.methodKey,
      });
    } else {
      const name =
        entry.enhancerRef.constructor?.name ??
        (entry.enhancerRef as Function).name;

      enhancers.push({
        name,
        methodKey: entry.methodKey,
      });
    }
    existingSourceNode.metadata.enhancers = enhancers;
  }

  private insertClassToClassEdge<T>(
    source: InstanceWrapper<T>,
    target: InstanceWrapper,
    moduleRef: Module,
    keyOrIndex: number | string | symbol | undefined,
    injectionType: 'constructor' | 'property' | 'decorator',
  ) {
    this.graph.insertEdge({
      source: source.id,
      target: target.id,
      metadata: {
        type: 'class-to-class',
        sourceModuleName: moduleRef.name,
        sourceClassName: source.name,
        targetClassName: target.name,
        sourceClassToken: source.token,
        targetClassToken: target.token,
        targetModuleName: target.host?.name,
        keyOrIndex,
        injectionType,
      },
    });
  }

  private insertClassNodes(moduleRef: Module) {
    moduleRef.providers.forEach(value =>
      this.insertClassNode(moduleRef, value, 'provider'),
    );
    moduleRef.middlewares.forEach(item =>
      this.insertClassNode(moduleRef, item, 'middleware'),
    );
    moduleRef.injectables.forEach(value =>
      this.insertClassNode(moduleRef, value, 'injectable'),
    );
    moduleRef.controllers.forEach(value =>
      this.insertClassNode(moduleRef, value, 'controller'),
    );
  }

  private insertClassNode(
    moduleRef: Module,
    wrapper: InstanceWrapper,
    type: Exclude<Node['metadata']['type'], 'module'>,
  ) {
    if (wrapper.metatype === moduleRef.metatype) {
      return;
    }
    this.graph.insertNode({
      id: wrapper.id,
      label: wrapper.name,
      parent: moduleRef.id,
      metadata: {
        type,
        sourceModuleName: moduleRef.name,
        durable: wrapper.isDependencyTreeDurable(),
        static: wrapper.isDependencyTreeStatic(),
        scope: wrapper.scope,
        transient: wrapper.isTransient,
        token: wrapper.token,
      },
    });
  }
}
