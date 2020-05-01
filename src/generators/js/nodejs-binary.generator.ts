import { BuildFileGenerator } from '../generator';
import { GeneratorType } from '../types';

export class NodejsBinaryGenerator extends BuildFileGenerator {

  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath().withTarget('bin');
    const path = this.flags.path;

    this.buildozer.loadRule('nodejs_binary', label);
    this.buildozer.newRule('nodejs_binary', label);

    this.buildozer.setAttr('entry_point',
      this.workspace.getFileLabel(path).toString(), label);

    this.buildozer.addAttr('data',
      [this.workspace.getLabelForFile(path).toString()], label);
  }

  getGeneratorType(): GeneratorType {
    return GeneratorType.JS_BINARY;
  }

  supportsDirectories(): boolean {
    return false;
  }
}
