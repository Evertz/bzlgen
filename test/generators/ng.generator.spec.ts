import * as mockfs from 'mock-fs';

import { setupAndParseArgs, GeneratorType } from '../../src/flags';
import { NgGenerator } from '../../src/generators/ng/ng.generator';
import { Workspace } from '../../src/workspace';

describe('ng generator', () => {
  const NG_COMPONENT =
    `import { component } from '@angular/core';
import * as r from 'rxjs/operators';
import { Observable } from 'rxjs';
@Component({
  templateUrl: './component.component.html',
  styleUrls: ['./component.component.scss']
})
export class SomeComponent {}
`;

  const NG_MODULE =
    `import { NgModule } from '@angular/core';
import { SomeComponent } from './component.component';
`;

  const setupForParse = type => {
    const argv = [
      type,
      './src/component',
      '--base_dir=/home/workspace',
      '--no-assert_is_bazel_workspace',
      '--load_mapping=sass_library=@io_bazel_rules_sass//sass:sass.bzl',
      '--load_mapping=sass_binary=@io_bazel_rules_sass//sass:sass.bzl',
      '--load_mapping=ng_module=@npm_angular_bazel//:index.bzl',
      '--label_mapping=rxjs/operators=@npm//rxjs',
      '--ng_module_bundle_load=//tools/rules_bazel/defs.bzl',
      '--ng_generate_theme_binary'
    ];
    return new Workspace(setupAndParseArgs(argv, true, 0));
  };

  const setupMockFs = () => {
    mockfs({
      '/home/workspace/src/component': {
        'component.component.ts': NG_COMPONENT,
        'component.module.ts': NG_MODULE,
        'component.component.scss': '',
        'component.component.html': '',
        'component.theme.scss': ''
      }
    });
  };

  afterEach(() => mockfs.restore());

  it('can generate ng_module with style and theme', () => {
    const workspace = setupForParse(GeneratorType.NG);
    const gen = new NgGenerator(workspace);

    setupMockFs();

    gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =
      'new_load @npm_angular_bazel//:index.bzl ng_module|//src/component:__pkg__\n' +
      'new ng_module component|//src/component:__pkg__\n' +
      'add srcs component.component.ts component.module.ts|//src/component:component\n' +
      'add deps @npm//@angular/core:core @npm//rxjs:rxjs|//src/component:component\n' +
      'add assets component.component.html //src/component:component-component-styles|//src/component:component\n' +
      'new_load @io_bazel_rules_sass//sass:sass.bzl sass_binary|//src/component:__pkg__\n' +
      'new sass_binary component-component-styles|//src/component:__pkg__\n' +
      'set src "component.component.scss"|//src/component:component-component-styles\n' +
      'new sass_binary component-theme-theme|//src/component:__pkg__\n' +
      'set src "component.theme.scss"|//src/component:component-theme-theme';

    expect(commands.join('\n')).toEqual(expected);
  });

  it('can generate ng_module bundles with style and theme', () => {
    const workspace = setupForParse(GeneratorType.NG_BUNDLE);
    const gen = new NgGenerator(workspace);

    setupMockFs();

    gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =
      'new_load //tools/rules_bazel/defs.bzl ng_module|//src/component:__pkg__\n' +
      'new ng_module component|//src/component:__pkg__\n' +
      'add ts_srcs component.component.ts component.module.ts|//src/component:component\n' +
      'add ts_deps @npm//@angular/core:core @npm//rxjs:rxjs|//src/component:component\n' +
      'set style "component.component.scss"|//src/component:component\n' +
      'add assets component.component.html|//src/component:component\n' +
      'set theme "component.theme.scss"|//src/component:component';

    expect(commands.join('\n')).toEqual(expected);
  });
});
