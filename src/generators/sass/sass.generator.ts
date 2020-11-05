import * as gonzales from 'gonzales-pe';
import { ParsedPath } from 'path';

import { Flags } from '../../flags';
import { Label } from '../../label';
import { log } from '../../logger';
import { Rule } from '../../rules';
import { Workspace } from '../../workspace';
import { BuildFileGenerator } from '../generator';
import { Generator } from '../resolve-generator';
import { GeneratorType } from '../types';
import { SassGeneratorFlagBuilder, SassGeneratorFlags } from './sass.generator.flags';

export class SassBinaryRule extends Rule {
  constructor(label: Label) {
    super('sass_binary', label);
  }
}

export class SassLibraryRule extends Rule {
  constructor(label: Label) {
    super('sass_library', label);
  }
}

@Generator({
  type: GeneratorType.SASS,
  flags: SassGeneratorFlagBuilder,
  description: 'Generates a sass_binary or sass_library depending on the input path type'
})
export class SassGenerator extends BuildFileGenerator {
  private readonly flags: Flags<SassGeneratorFlags>;

  constructor(workspace: Workspace) {
    super(workspace);

    this.flags = this.getFlags<SassGeneratorFlags>();
  }

  async generate(): Promise<void> {
    const flags = this.workspace.getFlags();
    const scss = this.workspace.readFileAtPath();

    const deps = this.calculateDeps(scss);

    const scssFileInfo = this.workspace.getPathInfo();
    const isSassLib = this.isSassLib(scssFileInfo);

    const ruleName = this.calculateRuleName(scssFileInfo.base,
      this.flags.scss_library_suffix, this.flags.scss_binary_suffix, isSassLib);

    const label = this.workspace.getLabelForPath();

    let rule: Rule;

    if (isSassLib) {
      rule = new SassLibraryRule(label.withTarget(ruleName))
        .setSrcs([scssFileInfo.base])
        .setDeps(deps);
    } else {
      rule = new SassBinaryRule(label.withTarget(ruleName))
        .setSrc(scssFileInfo.base)
        .setDeps(deps);
    }

    this.setDefaultVisibility(rule);
    this.buildozer.addRule(rule);
  }

  getGeneratorType(): GeneratorType {
    return GeneratorType.SASS;
  }

  supportsDirectories(): boolean {
    return false;
  }

  isSassLib(fileInfo: ParsedPath): boolean {
    return fileInfo.name.startsWith('_');
  }

  calculateRuleName(fileName: string, librarySuffix: string, binarySuffix: string, isSassLib: boolean): string {
    return this.workspace
      .getLabelForFile(fileName, isSassLib ? librarySuffix : binarySuffix)
      .getTarget();
  }

  calculateDeps(scss: string, resultsAreLabels = true): string[] {
    const flags = this.workspace.getFlags();
    const parseTree = gonzales.parse(scss, { syntax: 'scss' });

    const deps = new Set<string>();

    parseTree.forEach('atrule', node => {
      const isAtImportAtRule = node.content.find(content => {
        if (content.type !== 'atkeyword') { return false; }
        return content.content.find(n => n.type === 'ident' && n.content === 'import');
      });

      if (!isAtImportAtRule) { return; }

      const atImportPathNode = node.content.find(n => n.type === 'string');
      const importPath = atImportPathNode.content
        .replace(/'/g, '')
        .replace(/"/g, '');

      if (resultsAreLabels) {
        const label = this.calculateDependencyLabel(importPath, this.flags.scss_library_suffix);

        if (flags.verbose_import_mappings) {
          log(`${importPath}=${label}`);
        }

        deps.add(label);
      } else {
        deps.add(importPath);
      }
    });

    return Array.from(deps);
  }

  calculateDependencyLabel(importPath: string, librarySuffix: string): string {
    return this.workspace.getLabelForFile(importPath, librarySuffix).toString();
  }
}
