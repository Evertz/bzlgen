import { BuildFileGenerator } from '../generator';
import { Generator } from '../resolve-generator';
import { GeneratorType } from '../types';

@Generator({
  type: 'bzl_library',
  description: 'Generates a bzl_library for a collection of bzl files'
})
export class BzlLibraryGenerator extends BuildFileGenerator {
  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath();
    const bzl = label.withTarget('bzl');

    this.buildozer.loadRule('bzl_library', label);
    this.buildozer.newRule('bzl_library', bzl);

    const files = [];
    if (this.workspace.isDirectory()) {
      const labels = this.workspace.readDirectory()
        .filter(file => file.endsWith('.bzl'))
        .map(file => this.workspace.getFileLabel(file));

      files.push(...labels);
    } else {
      files.push(this.workspace.getFileLabel(this.getFlags().path));
    }

    this.buildozer.addAttr('srcs', files, bzl);

    this.setDefaultVisibilityOn(bzl);
  }

  getGeneratorType(): GeneratorType | string {
    return 'bzl_library';
  }

  supportsDirectories(): boolean {
    return true;
  }
}
