import * as mockfs from 'mock-fs';

import { setupAndParseArgs } from '../../src/flags';
import { TsGenerator } from '../../src/generators/ts/ts.generator';
import { Workspace } from '../../src/workspace';

describe('ng generator', () => {
  const TS_ONE =
    `import { component } from '@angular/core';
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
      '--load_mapping=ts_library=@npm_bazel_typescript//:index.bzl',
      '--label_mapping=rxjs/operators=@npm//rxjs',
      '--ts_config_label=//:tsconfig'
    ];

    workspace = new Workspace(setupAndParseArgs(argv, true, 0));
    gen = new TsGenerator(workspace);

    mockfs({
      '/home/workspace/src/some': {
        'one.ts': TS_ONE,
        'two.ts': TS_TWO,
        'component.component.scss': '',
        'component.component.html': '',
        'component.theme.scss': ''
      }
    });
  });

  afterEach(() => mockfs.restore());

  it('can generate ts_library with deps', () => {
    gen.generate();

    const commands = workspace.getBuildozer().toCommands();

    const expected =
      'new_load @npm_bazel_typescript//:index.bzl ts_library|//src/some:__pkg__\n' +
      'new ts_library some|//src/some:__pkg__\n' +
      'add srcs one.ts two.ts|//src/some:some\n' +
      'add deps @npm//@angular/core:core @npm//rxjs:rxjs|//src/some:some\n' +
      'set tsconfig "//:tsconfig"|//src/some:some';

    expect(commands.join('\n')).toEqual(expected);
  });
});
