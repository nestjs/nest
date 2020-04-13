import * as clc from 'cli-color';

import { InjectorDependencyContext } from '../injector/injector';
import {
  createInstanceNameAsCodeFactory,
  getIndent,
  getInstanceName,
} from './utils';
import { InstanceWrapper } from '../injector/instance-wrapper';

const getNameInConstructor = createInstanceNameAsCodeFactory(
  i => `@Inject('${i}')`,
  i => `@Inject(${i})`,
);

const getNameInExpression = createInstanceNameAsCodeFactory(i => `'${i}'`);

function getErrorArrow(offset: number, arrowLength: number, message: string) {
  let code = '';
  // Arrow
  code += getIndent(offset, ' ');
  code += clc.red.bold(getIndent(arrowLength, '^'));

  // Inline error message
  code += `  ${clc.red.bold(message)}\n`;

  return code;
}

function toCodeBlock(code: string): string {
  return code
    .split('\n')
    .map(line => `${clc.blue('|')} ${line}`)
    .join('\n');
}

function dependenciesToCode(dependencies: string[], errorIndex: number) {
  return dependencies
    .map((name, index) => {
      if (index === errorIndex) {
        return `    ${clc.red.bold(name.toString())},
    ${getErrorArrow(
      0,
      name.toString().length + 1,
      'not available in current context',
    )}`;
      } else {
        return `    ${name.toString()},`;
      }
    })
    .join('\n');
}

export function getClassCodeExcerpt(
  instanceWrapper: InstanceWrapper,
  dependencyContext: InjectorDependencyContext,
) {
  const { dependencies, index } = dependencyContext;
  const code = `${clc.cyan('class')} ${clc.green(
    getInstanceName(instanceWrapper),
  )} {
  ${clc.cyan('constructor')}(
${dependenciesToCode(dependencies.map(getNameInConstructor), index)}
  ) { }
`;

  return clc.white(toCodeBlock(code));
}

export function getUseFactoryCodeExcerpt(
  instanceWrapper: InstanceWrapper,
  dependencyContext: InjectorDependencyContext,
): string {
  const { dependencies, index } = dependencyContext;

  const code = `{
  provide: ${getNameInExpression(instanceWrapper.metatype)},
  inject: [
${dependenciesToCode(dependencies.map(getNameInExpression), index)}
  ]
}`;

  return clc.white(toCodeBlock(code));
}

export function getPropertyCodeExcerpt(
  instanceWrapper: InstanceWrapper,
  dependencyContext: InjectorDependencyContext,
): string {
  const { key, name } = dependencyContext;
  const injectExpression = `${getNameInConstructor(name)} ${key.toString()};`;
  const code = `${clc.cyan('class')} ${clc.green(
    getInstanceName(instanceWrapper),
  )} {
  ${clc.red.bold(injectExpression)}
  ${getErrorArrow(
    0,
    injectExpression.length,
    'not available in current context',
  )}
}`;

  return clc.white(toCodeBlock(code));
}
