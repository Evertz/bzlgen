import { Label } from '../../label';
import { Rule } from '../../rules';
import { BuildFileGenerator } from '../generator';
import { Generator } from '../resolve-generator';
import { GeneratorType } from '../types';

class FilegroupRule extends Rule {
  constructor(label: Label) {
    super('filegroup', label);
  }
}

@Generator({
  type: GeneratorType.FILEGROUP,
  description: 'Generates a filegroup native rule containing all the files captured by the path parameter'
})
export class FilegroupGenerator extends BuildFileGenerator {
  async generate(): Promise<void> {
    const label = this.workspace.getLabelForPath();

    const files = [];
    if (this.workspace.isDirectory()) {
      let labels = this.workspace.readDirectory()
        .map(file => this.workspace.getFileLabel(file));

      files.push(...labels);
    } else {
      files.push(this.workspace.getFileLabel(this.getFlags().path));
    }

    const filegroup = new FilegroupRule(label).setSrcs(files);
    this.setDefaultVisibility(filegroup);

    this.buildozer.addRule(filegroup);
  }

  getGeneratorType(): GeneratorType | string {
    return GeneratorType.FILEGROUP;
  }

  supportsDirectories(): boolean {
    return true;
  }
}
