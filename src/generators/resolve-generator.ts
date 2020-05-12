import { GeneratorType } from './types';
import { Workspace } from '../workspace';
import { BuildFileGenerator } from './generator';
import { fatal } from '../logger';

export interface FlagOptions {
  type: string
  description: string;
  group: string;
  default?: any;
  requiresArg?: boolean;
  choices?: string[];
  coerce?: () => any;
}

export type FlagBuilder = { [flag: string]: FlagOptions };

export interface Ref<T extends typeof BuildFileGenerator> {
  generator: T;
  type: GeneratorType | string;
  description: string;
  flags?: FlagBuilder;
}

export const GENERATORS: Map<string, Ref<any>> = new Map();

export function getGenerator(type: GeneratorType, workspace: Workspace): BuildFileGenerator {
  const ref = GENERATORS.get(type);

  if (!ref) {
    fatal(`No generator found for type ${type}`);
  }

  return new ref.generator(workspace);
}

export function Generator(options:
                            { type: GeneratorType | string | Array<string | GeneratorType>, flags?: FlagBuilder, description: string }) {
  return function (generator) {
    if (Array.isArray(options.type)) {
      options.type.forEach(type => {
        GENERATORS.set(type, { generator, flags: options.flags, type, description: options.description });
      });
    } else {
      GENERATORS.set(options.type, { generator, flags: options.flags, type: options.type, description: options.description });
    }
  }
}
