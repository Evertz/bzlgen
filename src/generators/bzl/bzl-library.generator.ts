import { Label } from '../../label';
import { Rule } from '../../rules';
import { BuildFileGenerator } from '../generator';
import { Generator } from '../resolve-generator';
import { GeneratorType } from '../types';

class BzlLibraryRule extends Rule {
  constructor(label: Label) {
    super('bzl_library', label)
  }
}

@Generator({
  type: 'bzl_library',
  description: 'Generates a bzl_library for a collection of bzl files'
})
export class BzlLibraryGenerator extends BuildFileGenerator {
  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath();
    const bzl = label.withTarget('bzl');

    const files = [];
    if (this.workspace.isDirectory()) {
      const labels = this.workspace.readDirectory()
        .filter(file => file.endsWith('.bzl'))
        .map(file => this.workspace.getFileLabel(file));

      files.push(...labels);
    } else {
      files.push(this.workspace.getFileLabel(this.getFlags().path));
    }

    const bzlLibraryRule = new BzlLibraryRule(bzl).setSrcs(files);
    this.setDefaultVisibility(bzlLibraryRule);

    this.buildozer.addRule(bzlLibraryRule);
  }

  getGeneratorType(): GeneratorType | string {
    return 'bzl_library';
  }

  supportsDirectories(): boolean {
    return true;
  }
}
