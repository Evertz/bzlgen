import mockfs from 'mock-fs';

import { CommonFlags, setupAndParseArgs } from '../../src/flags';
import { TsGenerator } from '../../src/generators/ts/ts.generator';
import { Workspace } from '../../src/workspace';
import { TsGeneratorFlags } from '../../src/generators/ts/ts.generator.flags';

describe('ts generator', () => {
  const TS_ONE =
    `import { component } from '@angular/core';
import { Foo } from '../other/foo';
import * as r from 'rxjs/operators';
import { Observable } from 'rxjs';

export * from './two.ts';

export class Some {}
`;

  const TS_TWO =
    `import { NgModule } from '@angular/core';`;

  let workspace: Workspace;
  let gen: TsGenerator;

  beforeEach(() => {
    const argv = [
      'ts',
      './src/some',
      '--base_dir=/home/workspace',
      '--no-assert_is_bazel_workspace',
      '--load_mapping=ts_library=@npm//bazel/typescript:index.bzl',
      '--label_mapping=rxjs/operators=@npm//rxjs',
      '--label_mapping=src/other/foo.ts=//mapped/label',
      '--ts_config_label=//:tsconfig'
    ];

    workspace = new Workspace(setupAndParseArgs(argv, true, 0));
    gen = new TsGenerator(workspace);
  });

  afterEach(() => mockfs.restore());

  it('can generate ts_library with deps', async () => {
    mockfs({
      '/home/workspace/src/some': {
        'one.ts': TS_ONE,
        'two.ts': TS_TWO,
        'component.component.scss': '',
        'component.component.html': '',
        'component.theme.scss': ''
      },
      '/home/workspace/src/other': {
        'foo.ts': '',
      }
    });

    await gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =
      'new_load @npm//bazel/typescript:index.bzl ts_library|//src/some:__pkg__\n' +
      'new ts_library some|//src/some:__pkg__\n' +
      'add srcs one.ts two.ts|//src/some:some\n' +
      'add deps @npm//@angular/core:core //mapped/label:label @npm//rxjs:rxjs|//src/some:some\n' +
      'set tsconfig "//:tsconfig"|//src/some:some';

    expect(commands.join('\n')).toEqual(expected);
  });

  it('can handle imports with double and single quotes', async () => {
    mockfs({
      '/home/workspace/src/some': {
        'one.ts': 'import { NgModule } from "@angular/core";\nimport * as r from \'rxjs/operators\'',
        'component.component.scss': '',
        'component.component.html': '',
        'component.theme.scss': ''
      },
      '/home/workspace/src/other': {
        'foo.ts': '',
      }
    });

    await gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =
      'new_load @npm//bazel/typescript:index.bzl ts_library|//src/some:__pkg__\n' +
      'new ts_library some|//src/some:__pkg__\n' +
      'add srcs one.ts|//src/some:some\n' +
      'add deps @npm//@angular/core:core @npm//rxjs:rxjs|//src/some:some\n' +
      'set tsconfig "//:tsconfig"|//src/some:some';

    expect(commands.join('\n')).toEqual(expected);
  });

  it('can use tsconfig paths', async () => {
    mockfs({
      '/home/workspace': {
        'tsconfig.json': `{"compilerOptions":{"paths":{"@foo/*":["src/some/nested/*"]}}}`,
        src: {
          some: {
            nested: {
              'main.ts': ''
            },
            'one.ts': `import { BAR } from '@foo/main'`,
          }
        }
      },
    });

    (workspace.getFlags() as TsGeneratorFlags).ts_config = 'tsconfig.json';
    gen = new TsGenerator(workspace);

    await gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =
      'new_load @npm//bazel/typescript:index.bzl ts_library|//src/some:__pkg__\n' +
      'new ts_library some|//src/some:__pkg__\n' +
      'add srcs one.ts|//src/some:some\n' +
      'add deps //src/some/nested:nested|//src/some:some\n' +
      'set tsconfig "//:tsconfig"|//src/some:some';

    expect(commands.join('\n')).toEqual(expected);
  });

  it('can strip all deep imports', async () => {
    mockfs({
      '/home/workspace/src/some': {
        'one.ts': `import {} from 'package'; import {} from 'package/deep'; import {} from '@scope/package';  import {} from '@scope/package/deep';`
      },
    },);

    await gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =`new_load @npm//bazel/typescript:index.bzl ts_library|//src/some:__pkg__
new ts_library some|//src/some:__pkg__
add srcs one.ts|//src/some:some
add deps @npm//package:package @npm//@scope/package:package|//src/some:some
set tsconfig "//:tsconfig"|//src/some:some`;

    expect(commands.join('\n')).toEqual(expected);
  });

  it('converts builtin imports for node types', async () => {
    mockfs({
      '/home/workspace/src/some': {
        'one.ts': `import * as fs from 'fs';`
      },
    },);

    await gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =`new_load @npm//bazel/typescript:index.bzl ts_library|//src/some:__pkg__
new ts_library some|//src/some:__pkg__
add srcs one.ts|//src/some:some
add deps @npm//@types/node:node|//src/some:some
set tsconfig "//:tsconfig"|//src/some:some`;

    expect(commands.join('\n')).toEqual(expected);
  });

  it('can set default package label as dep', async () => {
    mockfs({
      '/home/workspace/src/some': {
        'one.ts': `import {SOME_CONST} from './nested/two'; `
      },
      '/home/workspace/src/some/nested': {
        'two.ts': `export const SOME_CONST = '';`
      }
    });

    (workspace.getFlags() as CommonFlags).pkg_default_dep_labels = true;

    await gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =`new_load @npm//bazel/typescript:index.bzl ts_library|//src/some:__pkg__
new ts_library some|//src/some:__pkg__
add srcs one.ts|//src/some:some
add deps //src/some/nested:nested|//src/some:some
set tsconfig "//:tsconfig"|//src/some:some`;

    expect(commands.join('\n')).toEqual(expected);
  });

  it('can set file as dep label', async () => {
    mockfs({
      '/home/workspace/src/some': {
        'one.ts': `import {SOME_CONST} from './nested/two'; `
      },
      '/home/workspace/src/some/nested': {
        'two.ts': `export const SOME_CONST = '';`
      }
    });

    (workspace.getFlags() as CommonFlags).pkg_default_dep_labels = false;

    await gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =`new_load @npm//bazel/typescript:index.bzl ts_library|//src/some:__pkg__
new ts_library some|//src/some:__pkg__
add srcs one.ts|//src/some:some
add deps //src/some/nested:two|//src/some:some
set tsconfig "//:tsconfig"|//src/some:some`;

    expect(commands.join('\n')).toEqual(expected);
  });

});
