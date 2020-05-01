import { BuildFileGenerator } from '../generator';
import { GeneratorType } from '../types';

export class ContainerLayerGenerator extends BuildFileGenerator {

  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath().withTarget('layer');

    this.buildozer.loadRule('container_layer', label);
    this.buildozer.newRule('container_layer', label);

    const files = [];
    if (this.workspace.isDirectory()) {
      let labels = this.workspace.readDirectory()
        .map(file => this.workspace.getFileLabel(file));

      files.push(...labels);
    } else {
      files.push(this.workspace.getFileLabel(this.flags.path));
    }

    this.buildozer.addAttr('files', files, label);
  }

  getGeneratorType(): GeneratorType {
    return GeneratorType.CONTAINER_LAYER;
  }

  supportsDirectories(): boolean {
    return true;
  }
}
