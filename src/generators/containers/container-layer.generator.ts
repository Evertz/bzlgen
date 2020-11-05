import { Label } from '../../label';
import { Rule } from '../../rules';
import { BuildFileGenerator } from '../generator';
import { Generator } from '../resolve-generator';
import { GeneratorType } from '../types';

class ContainerLayerRule extends Rule {
  constructor(label: Label) {
    super('container_layer', label);
  }
}

@Generator({
  type: GeneratorType.CONTAINER_LAYER,
  description: 'Generates a container_layer rule containing all the files captured by the path parameter'
})
export class ContainerLayerGenerator extends BuildFileGenerator {

  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath().withTarget('layer');

    const files = [];
    if (this.workspace.isDirectory()) {
      let labels = this.workspace.readDirectory()
        .map(file => this.workspace.getFileLabel(file));

      files.push(...labels);
    } else {
      files.push(this.workspace.getFileLabel(this.getFlags().path));
    }

    const containerLayerRule = new ContainerLayerRule(label).setAttr('files', files);
    this.setDefaultVisibility(containerLayerRule);

    this.buildozer.addRule(containerLayerRule);
  }

  getGeneratorType(): GeneratorType {
    return GeneratorType.CONTAINER_LAYER;
  }

  supportsDirectories(): boolean {
    return true;
  }
}
