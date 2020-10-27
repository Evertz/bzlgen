import mockfs from 'mock-fs';

import { Workspace } from '../../src/workspace';
import { FilegroupGenerator } from '../../src/generators/builtin/filegroup.generator';
import { setupAndParseArgs } from '../../src/flags';

describe('filegroup generator', () => {
  let workspace: Workspace;
  let gen: FilegroupGenerator;

  afterEach(() => mockfs.restore());

  it('can generate for files in a package', () => {
    const argv = [
      'filegroup',
      './src',
      '--default_visibility=//:__subpackages__',
      '--base_dir=/home/workspace',
      '--no-assert_is_bazel_workspace'
    ];

    workspace = new Workspace(setupAndParseArgs(argv, true, 0));
    gen = new FilegroupGenerator(workspace);

    mockfs({
      '/home/workspace/src': {
        'foo.txt': '',
        'bar.txt': '',
        'baz.css': ''
      }
    });

    gen.generate();

    const commands = workspace.getBuildozer().toCommands().join('\n');
    const expected =
      'new filegroup src|//src:__pkg__\n' +
      'add srcs //src:bar.txt //src:baz.css //src:foo.txt|//src:src\n' +
      'add visibility //:__subpackages__|//src:src';

    expect(commands).toEqual(expected);
  });

  it('can generate for one file in a package', () => {
    const argv = [
      'filegroup',
      './src/foo.txt',
      '--base_dir=/home/workspace',
      '--no-assert_is_bazel_workspace'
    ];

    workspace = new Workspace(setupAndParseArgs(argv, true, 0));
    gen = new FilegroupGenerator(workspace);

    mockfs({
      '/home/workspace/src': {
        'foo.txt': '',
        'bar.txt': '',
        'baz.css': ''
      }
    });

    gen.generate();

    const commands = workspace.getBuildozer().toCommands().join('\n');
    const expected =
      'new filegroup src|//src:__pkg__\n' +
      'add srcs //src:foo.txt|//src:src';

    expect(commands).toEqual(expected);
  });

});
