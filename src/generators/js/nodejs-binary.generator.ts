import { Label } from '../../label';
import { Rule } from '../../rules';
import { BuildFileGenerator } from '../generator';
import { Generator } from '../resolve-generator';
import { GeneratorType } from '../types';

class NodeJsBinaryRule extends Rule {
  constructor(label: Label) {
    super('nodejs_binary', label);
  }
}

@Generator({
  type: GeneratorType.JS_BINARY,
  description: 'Generates a nodejs_binary rule setting the entry_point to the file at the given path'
})
export class NodejsBinaryGenerator extends BuildFileGenerator {

  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath().withTarget('bin');
    const path = this.getFlags().path;

    const nodejsBinaryRule = new NodeJsBinaryRule(label)
      .setAttr('entry_point', this.workspace.getFileLabel(path).toString())
      .setAttr('data', [this.workspace.getLabelForFile(path).toString()]);

    this.setDefaultVisibility(nodejsBinaryRule);
    this.buildozer.addRule(nodejsBinaryRule);
  }

  getGeneratorType(): GeneratorType {
    return GeneratorType.JS_BINARY;
  }

  supportsDirectories(): boolean {
    return false;
  }
}
