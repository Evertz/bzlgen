import { GeneratorType } from './types';
import { Workspace } from '../workspace';
import { BuildFileGenerator } from './generator';
import { fatal } from '../logger';

export const GENERATORS: Map<string, Ref<any>> = new Map();

export function getGenerator(type: GeneratorType, workspace: Workspace): BuildFileGenerator {
  const ref = GENERATORS.get(type);

  if (!ref) {
    fatal(`No generator found for type ${type}`);
  }

  return new ref.generator(workspace);
}

export interface GeneratorOptions {
  type: string;

  description: string;

  flags?: any | any[];

  deprecated?: boolean;

  implies?: { [k: string]: any };
}

export interface Ref<T extends typeof BuildFileGenerator> extends GeneratorOptions {
  generator: T;
}

export function Generator(options: GeneratorOptions) {
  return function (generator) {
    if (Array.isArray(options.type)) {
      options.type.forEach(type => {
        GENERATORS.set(type, { generator, ...options });
      });
    } else {
      GENERATORS.set(options.type, { generator, ...options });
    }
  }
}
