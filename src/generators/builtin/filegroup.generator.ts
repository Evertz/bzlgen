import { BuildFileGenerator } from '../generator';
import { Generator } from '../resolve-generator';
import { GeneratorType } from '../types';

@Generator({
  type: GeneratorType.FILEGROUP,
  description: 'Generates a filegroup native rule containing all the files captured by the path parameter'
})
export class FilegroupGenerator extends BuildFileGenerator {
  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath();

    this.buildozer.newRule('filegroup', label);

    const files = [];
    if (this.workspace.isDirectory()) {
      let labels = this.workspace.readDirectory()
        .map(file => this.workspace.getFileLabel(file));

      files.push(...labels);
    } else {
      files.push(this.workspace.getFileLabel(this.getFlags().path));
    }

    this.buildozer.addAttr('srcs', files, label);

    if (this.getFlags().default_visibility) {
      this.buildozer.setVisibility([this.getFlags().default_visibility], label);
    }
  }

  getGeneratorType(): GeneratorType | string {
    return GeneratorType.FILEGROUP;
  }

  supportsDirectories(): boolean {
    return true;
  }
}
