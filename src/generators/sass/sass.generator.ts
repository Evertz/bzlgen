import * as gonzales from 'gonzales-pe';
import { ParsedPath } from 'path';

import { Buildozer } from '../../buildozer';
import { GeneratorType } from '../../flags';
import { log } from '../../logger';
import { Workspace } from '../../workspace';
import { BuildFileGenerator } from '../generator';

export class SassGenerator extends BuildFileGenerator {
  private readonly buildozer: Buildozer;

  constructor(private readonly workspace: Workspace) {
    super();
    this.buildozer = workspace.getBuildozer();
  }

  async generate(): Promise<void> {
    const flags = this.workspace.getFlags();
    const scss = this.workspace.readFileAtPath();

    const deps = this.calculateDeps(scss);

    const scssFileInfo = this.workspace.getPathInfo();
    const isSassLib = this.isSassLib(scssFileInfo);

    const ruleName = this.calculateRuleName(scssFileInfo.base,
      flags.scss_library_suffix, flags.scss_binary_suffix, isSassLib);

    const label = this.workspace.getLabelForPath();

    if (isSassLib) {
      const sassLib = this.buildozer.newSassLibraryRule(label.withTarget(ruleName))
        .setSrcs([scssFileInfo.base])
        .setDeps(deps);

      if (flags.default_visibility) {
        sassLib.setVisibility(flags.default_visibility);
      }
    } else {
      const sassBin = this.buildozer.newSassBinaryRule(label.withTarget(ruleName))
        .setSrc(scssFileInfo.base)
        .setDeps(deps);

      if (flags.default_visibility) {
        sassBin.setVisibility(flags.default_visibility);
      }
    }
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
        const label = this.calculateDependencyLabel(importPath, flags.scss_library_suffix);

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
