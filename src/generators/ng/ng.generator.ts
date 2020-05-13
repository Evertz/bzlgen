import { tsquery } from '@phenomnomnominal/tsquery';
import { parse } from 'path';
import { StringLiteral } from 'typescript';

import { fatal } from '../../logger';
import { Workspace } from '../../workspace';
import { Generator } from '../resolve-generator';
import { SassGenerator } from '../sass/sass.generator';
import { TsGenerator } from '../ts/ts.generator';
import { GeneratorType } from '../types';
import { NgGeneratorFlagBuilder, NgGeneratorFlags } from './ng.generator.flags';

const STYLE_URLS_QUERY = 'Decorator:has(Decorator > CallExpression[expression.name="Component"]) PropertyAssignment:has([name="styleUrls"]) ArrayLiteralExpression StringLiteral';
const TEMPLATE_URL_QUERY = 'Decorator:has(Decorator > CallExpression[expression.name="Component"]) PropertyAssignment:has([name="templateUrl"]) StringLiteral';

type TsFileResultContainer = {
  tsDeps: Set<string>
  styles: Map<string, { deps: Set<string>, name: string }>
  assets: Set<string>
};

@Generator({
  type: GeneratorType.NG,
  flags: NgGeneratorFlagBuilder,
  description: 'Generates a ng_module rule for an Angular component'
})
@Generator({
  type: GeneratorType.NG_BUNDLE,
  flags: NgGeneratorFlagBuilder,
  description: 'Generates a ng_module macro rule for an Angular component'
})
export class NgGenerator extends TsGenerator {

  constructor(readonly workspace: Workspace) {
    super(workspace);
  }

  async generate(): Promise<void> {
    const files = this.workspace.readDirectory();

    const tsFiles = files
      .filter(file => file.endsWith('.ts'))
      .filter(file => !(this.flags.ignore_spec_files && file.endsWith('.spec.ts')));

    const resultContainer: TsFileResultContainer = {
      tsDeps: new Set(),
      styles: new Map(),
      assets: new Set()
    };

    tsFiles
      .forEach((file, i, arr) => this.processTsFile(file, arr, this.flags.npm_workspace_name, this.flags.suffix_separator, resultContainer));

    if (this.getGeneratorType() === GeneratorType.NG) {
      this.generateNgModule(files, tsFiles, resultContainer);
    } else {
      this.generateNgModuleBundle(files, tsFiles, resultContainer);
    }
  }

  getGeneratorType(): GeneratorType {
    return this.workspace.getFlags().type;
  }

  supportsDirectories(): boolean {
    return true;
  }

  validate(): boolean {
    if (!this.workspace.isDirectory()) {
      fatal('Path passed to Angular generator must be a directory');
    }

    return true;
  }

  private processTsFile(filePath: string, tsFiles: string[], npmWorkspace: string, suffixSeparator: string,
                        resultContainer: TsFileResultContainer) {
    const file = this.workspace.readFile(filePath);
    const ast = tsquery.ast(file);

    this.processTsFileAst(ast, tsFiles, npmWorkspace, resultContainer.tsDeps);

    const templateUrlNode = tsquery(ast, TEMPLATE_URL_QUERY)[0] as StringLiteral;

    if (templateUrlNode && templateUrlNode.text.startsWith('./')) {
      const url = templateUrlNode.text;
      const splits = url.split('/');

      if (splits.length === 2 || splits.length === 0) {
        // TODO(matt) internally there are some templates that pull from the parent directory
        // and bzl gen handles it in a hacky way - don't port this behaviour yet
        // additionally - ensure that the path only contains one (or none) '/', meaning that it's in the same package

        // we don't need a label for the html file, but we do need to strip a leading './' if present
        resultContainer.assets.add(templateUrlNode.text.replace(/\.\//, ''));
      }
    }

    const styleUrlsNodes = tsquery(ast, STYLE_URLS_QUERY) as StringLiteral[];

    if (styleUrlsNodes && styleUrlsNodes.length) {
      const abstractStyles = styleUrlsNodes
        .map(node => node.text)
        .filter(text => text.startsWith('..'));

      if (abstractStyles.length) {
        // the component has a style imported from a parent directory
        // we can't generate files into the parent directory under bazel, so throw an error here
        // showing the user how this can be fixed
        const message = `Unable to generate target Angular component in file ${ filePath } as it contains a reference ` +
          `to the following style sheets imported from the parent directory:\n\t${ abstractStyles.join('\n\t') }\n` +
          `This can be fixed by using adding an @import for each sass file`;
        fatal(message);
      }

      const scssFiles = styleUrlsNodes
        .map(node => node.text)
        .filter(text => text.startsWith('./'));

      const sassGen = new SassGenerator(this.workspace);
      resultContainer.styles = this.calculateScssDependencyLabels(scssFiles, sassGen, suffixSeparator, 'styles');
    }
  }

  private calculateScssDependencyLabels(scssFiles: string[], sassGen: SassGenerator, suffixSeparator: string,
                                        labelSuffix: string): Map<string, { deps: Set<string>, name: string }> {
    if (!scssFiles.length) { return new Map(); }

    const results = new Map<string, { deps: Set<string>, name: string }>();
    scssFiles
      .forEach(path => {
        const file = this.workspace.readFile(path);
        const labels = sassGen.calculateDeps(file, false)
          .map(imp => sassGen.calculateDependencyLabel(imp, labelSuffix));

        const name = sassGen.calculateDependencyLabel(path, labelSuffix);

        results.set(
          path
            .replace(/'/g, '')
            .replace(/"/g, '')
            .replace(/\.\//g, ''), { deps: new Set(labels), name }
        );
      });

    return results;
  }

  private generateNgModule(allFiles: string[], tsFiles: string[], resultContainer: TsFileResultContainer) {
    const flags = this.workspace.getFlags();

    const styleRules = Array.from(resultContainer.styles.values())
      .map(value => value.name);

    // generate the ng_module
    this.buildozer.newNgModuleRule(this.workspace.getLabelForPath())
      .setSrcs(tsFiles.map(file => file.split('/').pop()))
      .addDeps(Array.from(resultContainer.tsDeps))
      .addAssets(Array.from(resultContainer.assets).concat(styleRules))
      .setVisibility(flags.default_visibility);

    // generate the sass_binary for styles
    resultContainer.styles.forEach((data, src) => {
      this.buildozer.newSassBinaryRule(this.workspace.getLabelForPath().withTarget(data.name.split(':')[1]))
        .setSrc(src)
        .setDeps(Array.from(data.deps));

      // TODO(matt): if there are deps on a sass import in the same package we should be able to generate it here
    });

    if (this.getFlags<NgGeneratorFlags>().ng_generate_theme_binary) {
      const themeFiles = allFiles.filter(file => file.endsWith('.theme.scss') && !file.startsWith('_'));
      const themes = this.calculateScssDependencyLabels(themeFiles, new SassGenerator(this.workspace), flags.suffix_separator, 'theme');

      themes.forEach((data, src) => {
        this.buildozer.newSassBinaryRule(this.workspace.getLabelForPath().withTarget(data.name.split(':')[1]))
          .setSrc(parse(src).base)
          .setDeps(Array.from(data.deps));
      });
    }
  }

  private generateNgModuleBundle(allFiles: string[], tsFiles: string[], resultContainer: TsFileResultContainer) {
    const pathLabel = this.workspace.getLabelForPath();
    const flags = this.getFlags<NgGeneratorFlags>();

    this.buildozer.newLoad(flags.ng_module_bundle_load, 'ng_module', pathLabel);
    this.buildozer.newRule('ng_module', pathLabel);
    this.buildozer.addAttr('srcs', tsFiles.map(file => file.split('/').pop()), pathLabel);
    this.buildozer.addAttr('deps', Array.from(resultContainer.tsDeps), pathLabel);

    if (resultContainer.styles.size) {
      // ng_module macro only supports one style
      const style = Array.from(resultContainer.styles.entries())[0];
      this.buildozer.setAttr('style', style[0], pathLabel);

      if (style[1].deps.size) {
        this.buildozer.addAttr('style_deps', Array.from(style[1].deps), pathLabel);
      }
    }

    if (resultContainer.assets.size) {
      this.buildozer.addAttr('assets', Array.from(resultContainer.assets), pathLabel);
    }

    if (flags.ng_generate_theme_binary) {
      const themeFiles = allFiles.filter(file => file.endsWith('.theme.scss') && !file.startsWith('_'));
      if (themeFiles.length) {
        const themes = this.calculateScssDependencyLabels(themeFiles, new SassGenerator(this.workspace), flags.suffix_separator, 'theme');
        this.buildozer.setAttr('theme', themeFiles[0].split('/').pop(), pathLabel);

        const theme = themes.get(themeFiles[0]);
        if (theme.deps.size) {
          this.buildozer.addAttr('theme_deps', Array.from(theme.deps), pathLabel);
        }
      }
    }
  }
}
