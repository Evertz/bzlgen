import { GeneratorType } from './types';
import { Workspace } from '../workspace';
import { BuildFileGenerator } from './generator';
import { SassGenerator } from './sass/sass.generator';
import { TsGenerator } from './ts/ts.generator';
import { NgGenerator } from './ng/ng.generator';
import { NodejsBinaryGenerator } from './js/nodejs-binary.generator';
import { ContainerLayerGenerator } from './containers/container-layer.generator';
import { fatal } from '../logger';

export function getGenerator(type: GeneratorType, workspace: Workspace): BuildFileGenerator {
  switch (type)  {
    case GeneratorType.SASS:
      return new SassGenerator(workspace);
    case GeneratorType.TS:
      return new TsGenerator(workspace);
    case GeneratorType.NG:
    case GeneratorType.NG_BUNDLE:
      return new NgGenerator(workspace);
    case GeneratorType.JS_BINARY:
      return new NodejsBinaryGenerator(workspace);
    case GeneratorType.CONTAINER_LAYER:
      return new ContainerLayerGenerator(workspace);
    default:
      fatal(`No generator found for type ${type}`);
  }
}
